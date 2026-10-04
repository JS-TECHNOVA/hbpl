import tempfile
import base64
import hashlib
import hmac
import json
from io import BytesIO
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone
from PIL import Image
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from .api import ApplicationDocumentSerializer, _send_verification_code
from .models import ApplicationEvent, CashfreeExamPayment, Exam, ExamApplication, ExamCentre, ExamResult, ExamSamplePaper, ExaminationSession, StudentEmailVerification, StudentProfile
from .tasks import send_exam_application_confirmation_email, send_exam_application_status_email, send_exam_payment_confirmation_email


def registration_data(email):
    image_buffer = BytesIO()
    Image.new("RGB", (1, 1), color="white").save(image_buffer, format="PNG")
    image_content = image_buffer.getvalue()
    return {
        "email": email,
        "password": "ValidPass123!",
        "full_name": "Test Student",
        "date_of_birth": "2010-01-01",
        "class_name": "10",
        "address": "12 Main Road",
        "school_name": "Central School",
        "father_name": "Test Father",
        "mother_name": "Test Mother",
        "phone": "9876543210",
        "photo": SimpleUploadedFile("photo.png", image_content, content_type="image/png"),
        "signature": SimpleUploadedFile("signature.png", image_content, content_type="image/png"),
    }


class ExaminationWorkflowTests(APITestCase):
    def setUp(self):
        self.staff = User.objects.create_user("staff", password="ValidPass123!", is_staff=True)
        self.session = ExaminationSession.objects.create(
            code="2026-27", name="2026-27", is_published=True,
        )
        self.exam = Exam.objects.create(
            session=self.session,
            code="general-aptitude-2026",
            slug="general-aptitude-2026",
            name="General Aptitude Competition 2026",
            status=Exam.Status.REGISTRATION_OPEN,
            is_published=True,
            application_prefix="HBPL26",
        )

    def test_staff_can_upload_list_and_delete_exam_sample_papers(self):
        token, _ = Token.objects.get_or_create(user=self.staff)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
        another_exam = Exam.objects.create(
            session=self.session, code="another-exam", slug="another-exam", name="Another exam",
            status=Exam.Status.REGISTRATION_OPEN,
        )
        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            response = self.client.post("/api/v1/staff/sample-papers/", {
                "exam_id": self.exam.id,
                "title": "Mathematics practice paper",
                "caption": "Practice questions for the upcoming examination.",
                "file": SimpleUploadedFile("maths.pdf", b"%PDF-1.4 sample", content_type="application/pdf"),
            }, format="multipart")
            self.assertEqual(response.status_code, 201, response.data)
            paper_id = response.data["id"]
            self.assertEqual(response.data["exam_id"], self.exam.id)
            self.assertEqual(response.data["caption"], "Practice questions for the upcoming examination.")
            self.assertEqual(len(self.client.get(f"/api/v1/staff/sample-papers/?exam_id={self.exam.id}").data), 1)
            self.assertEqual(self.client.get(f"/api/v1/staff/sample-papers/?exam_id={another_exam.id}").data, [])
            public_detail = self.client.get(f"/api/v1/exams/{self.exam.slug}/")
            self.assertEqual(public_detail.status_code, 200)
            self.assertEqual([item["title"] for item in public_detail.data["sample_papers"]], ["Mathematics practice paper"])
            deleted = self.client.delete(f"/api/v1/staff/sample-papers/{paper_id}/")
            self.assertEqual(deleted.status_code, 204)
            self.assertFalse(ExamSamplePaper.objects.filter(pk=paper_id).exists())

    def test_public_exam_normalizes_legacy_allowed_classes_values(self):
        self.exam.allowed_classes = ['["1", "2", "3"]', r'\"4\"', r'\"5\"', "9, 10"]
        self.exam.save(update_fields=["allowed_classes"])

        response = self.client.get(f"/api/v1/exams/{self.exam.slug}/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["allowed_classes"], ["1", "2", "3", "4", "5", "9", "10"])

    def test_application_photo_upload_is_rejected_over_size_limit(self):
        oversized_photo = SimpleUploadedFile(
            "student.jpg", b"x" * (2 * 1024 * 1024 + 1), content_type="image/jpeg",
        )
        serializer = ApplicationDocumentSerializer(data={
            "document_type": "photo",
            "file": oversized_photo,
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn("file", serializer.errors)

    def test_quick_apply_enrolls_from_one_time_profile_and_copies_documents(self):
        user = User.objects.create_user(
            "student@example.com", email="student@example.com", password="ValidPass123!",
            first_name="Asha", last_name="Kumar",
        )
        token, _ = Token.objects.get_or_create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            image_buffer = BytesIO()
            Image.new("RGB", (1, 1), color="white").save(image_buffer, format="PNG")
            image_content = image_buffer.getvalue()
            profile = StudentProfile.objects.create(
                user=user, phone="9876543210", date_of_birth="2010-05-12", father_name="Raj Kumar",
                mother_name="Sita Kumar", school_name="Central School", class_name="10",
                address="12 Main Road", photo=SimpleUploadedFile("photo.png", image_content, content_type="image/png"),
                signature=SimpleUploadedFile("signature.png", image_content, content_type="image/png"),
            )
            response = self.client.post("/api/v1/applications/quick-apply/", {"exam_id": self.exam.id}, format="json")
            self.assertEqual(response.status_code, 201, response.data)
            application = ExamApplication.objects.get(exam=self.exam, student=profile)
            self.assertEqual(application.status, ExamApplication.Status.SUBMITTED)
            self.assertEqual(application.full_name, "Asha Kumar")
            self.assertEqual(set(application.documents.values_list("document_type", flat=True)), {"photo", "signature"})
            self.assertTrue(application.application_number)
            self.assertEqual(response.data["payment_status"], CashfreeExamPayment.Status.PAID)
            payment = application.cashfree_payments.get()
            self.assertEqual(payment.amount, 0)
            self.assertEqual(payment.status, CashfreeExamPayment.Status.PAID)
            self.assertEqual(payment.payment_method, CashfreeExamPayment.Method.NO_CHARGE)

            from pypdf import PdfReader
            form = self.client.get(f"/api/v1/applications/{application.pk}/form/")
            pdf_text = "\n".join(page.extract_text() or "" for page in PdfReader(BytesIO(form.content)).pages)
            self.assertIn("INR 0.00", pdf_text)
            self.assertIn("No charge", pdf_text)

            self.assertEqual(self.client.post("/api/v1/applications/quick-apply/", {"exam_id": self.exam.id}, format="json").status_code, 200)
            self.assertEqual(ExamApplication.objects.filter(exam=self.exam, student=profile).count(), 1)
            self.assertEqual(application.cashfree_payments.count(), 1)

    def test_student_can_have_results_for_multiple_exam_enrollments(self):
        student_user = User.objects.create_user(
            "multi-exam@example.com", email="multi-exam@example.com", password="ValidPass123!",
        )
        profile = StudentProfile.objects.create(user=student_user)
        another_exam = Exam.objects.create(
            session=self.session,
            code="science-2026",
            slug="science-2026",
            name="Science Examination 2026",
            status=Exam.Status.RESULT_OUT,
        )
        self.exam.status = Exam.Status.RESULT_OUT
        self.exam.save(update_fields=["status"])
        applications = [
            ExamApplication.objects.create(
                exam=exam,
                student=profile,
                application_number=number,
                status=ExamApplication.Status.APPROVED,
                full_name="Asha Kumar",
                email=student_user.email,
            )
            for exam, number in ((self.exam, "HBPL26-00001"), (another_exam, "HBPL26-00002"))
        ]

        self.client.force_authenticate(user=self.staff)
        for application, marks in zip(applications, (84, 91)):
            response = self.client.post("/api/v1/staff/exam-results/", {
                "application_id": application.id,
                "total_marks": 100,
                "obtained_marks": marks,
            }, format="json")
            self.assertEqual(response.status_code, 201, response.data)

        self.assertEqual(ExamResult.objects.filter(application__student=profile).count(), 2)
        self.client.force_authenticate(user=student_user)
        results = self.client.get("/api/v1/results/")
        self.assertEqual(results.status_code, 200)
        self.assertEqual({result["exam"] for result in results.data}, {self.exam.name, another_exam.name})

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend", EXAM_PORTAL_URL="https://portal.example")
    def test_submitted_application_sends_one_branded_confirmation_email(self):
        user = User.objects.create_user("applicant@example.com", email="applicant@example.com")
        profile = StudentProfile.objects.create(user=user)
        application = ExamApplication.objects.create(
            exam=self.exam,
            student=profile,
            application_number="HBPL26-00001",
            status=ExamApplication.Status.SUBMITTED,
            full_name="Example Student",
            email=user.email,
            submitted_at=timezone.now(),
        )

        self.assertEqual(send_exam_application_confirmation_email.run(application.pk), "sent")
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [user.email])
        self.assertIn("HBPL26-00001", mail.outbox[0].body)
        self.assertEqual(mail.outbox[0].alternatives[0][1], "text/html")
        self.assertIn("#172438", mail.outbox[0].alternatives[0][0])
        self.assertEqual(send_exam_application_confirmation_email.run(application.pk), "already-sent")
        self.assertEqual(len(mail.outbox), 1)

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend", EXAM_PORTAL_URL="https://portal.example")
    def test_review_status_email_is_sent_once_with_staff_note(self):
        user = User.objects.create_user("status@example.com", email="status@example.com")
        profile = StudentProfile.objects.create(user=user)
        application = ExamApplication.objects.create(
            exam=self.exam, student=profile, application_number="HBPL26-00002",
            status=ExamApplication.Status.APPROVED, full_name="Status Student", email=user.email,
        )
        event = ApplicationEvent.objects.create(
            application=application, event_type="status_changed",
            from_status=ExamApplication.Status.UNDER_REVIEW,
            to_status=ExamApplication.Status.APPROVED,
            note="Approved by the examination team.",
        )
        self.assertEqual(send_exam_application_status_email.run(event.pk), "sent")
        event.refresh_from_db()
        self.assertIsNotNone(event.notification_email_sent_at)
        self.assertIn("Approved by the examination team.", mail.outbox[0].body)
        self.assertEqual(send_exam_application_status_email.run(event.pk), "already-sent")
        self.assertEqual(len(mail.outbox), 1)

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_email_verification_code_is_prominent_in_html_email(self):
        user = User.objects.create_user("verify@example.com", email="verify@example.com")
        with patch("core.emailing.get_active_email_service", return_value=None):
            _send_verification_code(user)

        self.assertEqual(len(mail.outbox), 1)
        html = mail.outbox[0].alternatives[0][0]
        self.assertIn("font-size:36px", html)
        self.assertIn("letter-spacing:10px", html)
        self.assertRegex(html, r">\d{6}</span>")
        self.assertRegex(mail.outbox[0].body, r"\n\n\d{6}\n\n")

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    def test_successfully_verifying_registration_sends_confirmation_email_once(self):
        user = User.objects.create_user(
            "confirmed@example.com", email="confirmed@example.com", first_name="Asha", last_name="Kumar",
        )
        profile = StudentProfile.objects.create(user=user)
        StudentEmailVerification.objects.create(
            user=user,
            code_hash=make_password("123456"),
            expires_at=timezone.now() + timedelta(minutes=15),
        )

        with patch("core.emailing.get_active_email_service", return_value=None):
            response = self.client.post("/api/v1/auth/verify-email/", {
                "email": user.email,
                "code": "123456",
            }, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertIn("registration is complete", response.data["detail"])
        profile.refresh_from_db()
        self.assertTrue(profile.email_verified)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [user.email])
        self.assertIn("Registration complete", mail.outbox[0].alternatives[0][0])
        self.assertIn("Asha Kumar", mail.outbox[0].alternatives[0][0])

        duplicate = self.client.post("/api/v1/auth/verify-email/", {
            "email": user.email,
            "code": "123456",
        }, format="json")
        self.assertEqual(duplicate.status_code, 400)
        self.assertEqual(len(mail.outbox), 1)

    def test_password_reset_is_generic_and_changes_password_with_valid_token(self):
        user = User.objects.create_user("reset@example.com", email="reset@example.com", password="ValidPass123!")
        StudentProfile.objects.create(user=user, email_verified=True)
        with patch("exams.tasks.send_student_password_reset_email.delay") as queue_email:
            response = self.client.post("/api/v1/auth/password-reset/", {"email": user.email}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["detail"], self.client.post(
            "/api/v1/auth/password-reset/", {"email": "missing@example.com"}, format="json",
        ).data["detail"])
        user_id, uid, token = queue_email.call_args.args
        self.assertEqual(user_id, user.pk)
        result = self.client.post("/api/v1/auth/password-reset/confirm/", {
            "uid": uid, "token": token, "password": "NewValidPass987!",
        }, format="json")
        self.assertEqual(result.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.check_password("NewValidPass987!"))
        self.assertEqual(self.client.post("/api/v1/auth/password-reset/confirm/", {
            "uid": uid, "token": token, "password": "AnotherValidPass987!",
        }, format="json").status_code, 400)

    def test_staff_review_transition_queues_notification_after_commit(self):
        user = User.objects.create_user("reviewed@example.com", email="reviewed@example.com")
        profile = StudentProfile.objects.create(user=user)
        application = ExamApplication.objects.create(
            exam=self.exam, student=profile, status=ExamApplication.Status.UNDER_REVIEW,
            full_name="Reviewed Student", email=user.email,
        )
        staff_token, _ = Token.objects.get_or_create(user=self.staff)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {staff_token.key}")
        with patch("exams.tasks.send_exam_application_status_email.delay") as queue_email:
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(
                    f"/api/v1/staff/applications/{application.pk}/transition/",
                    {"status": ExamApplication.Status.CORRECTION_REQUIRED, "note": "Please upload a clearer photo."},
                    format="json",
                )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(queue_email.call_args.args[0], application.events.first().pk)

    def test_public_listing_only_returns_published_exam(self):
        response = self.client.get("/api/v1/exams/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.data], [self.exam.id])

    def test_student_can_create_and_submit_application(self):
        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            register = self.client.post("/api/v1/auth/register/", registration_data("student@example.com"), format="multipart")
        self.assertEqual(register.status_code, 201)
        self.assertNotIn("token", register.data)
        profile = StudentProfile.objects.get(user__email="student@example.com")
        self.assertEqual(profile.class_name, "10")
        self.assertEqual(profile.school_name, "Central School")
        self.assertEqual(profile.father_name, "Test Father")
        self.assertEqual(profile.mother_name, "Test Mother")
        self.assertEqual(profile.date_of_birth.isoformat(), "2010-01-01")
        self.assertTrue(profile.photo.name)
        self.assertTrue(profile.signature.name)
        StudentProfile.objects.filter(user__email="student@example.com").update(email_verified=True)
        login = self.client.post("/api/v1/auth/login/", {
            "email": "student@example.com",
            "password": "ValidPass123!",
        }, format="json")
        self.assertEqual(login.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {login.data['token']}")

        draft = self.client.post("/api/v1/applications/", {
            "exam_id": self.exam.id,
            "full_name": "Test Student",
            "date_of_birth": "2010-01-01",
            "phone": "9999999999",
            "email": "student@example.com",
        }, format="json")
        self.assertEqual(draft.status_code, 201)
        self.assertEqual(draft.data["status"], ExamApplication.Status.DRAFT)

        with patch("exams.tasks.send_exam_application_confirmation_email.delay") as queue_email:
            with self.captureOnCommitCallbacks(execute=True):
                submitted = self.client.post(f"/api/v1/applications/{draft.data['id']}/submit/", {}, format="json")
        self.assertEqual(submitted.status_code, 200)
        self.assertEqual(submitted.data["application_number"], "HBPL26-00001")
        self.assertEqual(submitted.data["status"], ExamApplication.Status.SUBMITTED)
        free_payment = ExamApplication.objects.get(pk=draft.data["id"]).cashfree_payments.get()
        self.assertEqual(free_payment.amount, 0)
        self.assertEqual(free_payment.status, CashfreeExamPayment.Status.PAID)
        self.assertEqual(free_payment.payment_method, CashfreeExamPayment.Method.NO_CHARGE)
        queue_email.assert_called_once_with(draft.data["id"])

    def test_student_can_download_submitted_application_form_only_for_their_own_enrollment(self):
        from pypdf import PdfReader

        student = User.objects.create_user("form-student@example.com", email="form-student@example.com")
        profile = StudentProfile.objects.create(user=student, class_name="10", school_name="Central School")
        application = ExamApplication.objects.create(
            exam=self.exam,
            student=profile,
            application_number="HBPL26-00042",
            status=ExamApplication.Status.SUBMITTED,
            full_name="Asha Kumar",
            email=student.email,
            class_name="10",
            school_name="Central School",
            submitted_at=timezone.now(),
        )
        self.exam.fee = "75.00"
        self.exam.save(update_fields=["fee"])
        CashfreeExamPayment.objects.create(
            application=application,
            order_id="order-form-test",
            payment_session_id="session-form-test",
            amount="75.00",
            status=CashfreeExamPayment.Status.PAID,
            cf_payment_id="cf-form-test",
            paid_at=timezone.now(),
        )
        self.client.force_authenticate(user=student)

        response = self.client.get(f"/api/v1/applications/{application.pk}/form/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertTrue(response.content.startswith(b"%PDF"))
        pdf_text = "\n".join(page.extract_text() or "" for page in PdfReader(BytesIO(response.content)).pages)
        self.assertIn("PAYMENT DETAILS", pdf_text)
        self.assertIn("order-form-test", pdf_text)
        self.assertIn("cf-form-test", pdf_text)
        self.assertIn("75.00", pdf_text)

        other_student = User.objects.create_user("other-student@example.com", email="other-student@example.com")
        self.client.force_authenticate(user=other_student)
        self.assertEqual(self.client.get(f"/api/v1/applications/{application.pk}/form/").status_code, 404)

        draft = ExamApplication.objects.create(exam=self.exam, student=StudentProfile.objects.create(user=User.objects.create_user("draft@example.com")), full_name="Draft")
        self.client.force_authenticate(user=draft.student.user)
        self.assertEqual(self.client.get(f"/api/v1/applications/{draft.pk}/form/").status_code, 400)

    def test_paid_exam_enrollment_stays_draft_until_cashfree_confirms_payment(self):
        student = User.objects.create_user("cashfree-student@example.com", email="cashfree-student@example.com")
        profile = StudentProfile.objects.create(user=student, class_name="10")
        self.exam.fee = "75.00"
        self.exam.save(update_fields=["fee"])
        application = ExamApplication.objects.create(
            exam=self.exam,
            student=profile,
            full_name="Asha Kumar",
            email=student.email,
            phone="9876543210",
            date_of_birth="2010-05-12",
            class_name="10",
        )
        self.client.force_authenticate(user=student)

        with patch("exams.api._cashfree_request") as cashfree_request:
            cashfree_request.return_value = {"payment_session_id": "session_test_123"}
            order_response = self.client.post(f"/api/v1/applications/{application.pk}/payment-order/", {}, format="json")
            self.assertEqual(order_response.status_code, 200, order_response.data)
            self.assertEqual(order_response.data["payment_session_id"], "session_test_123")
            application.refresh_from_db()
            self.assertEqual(application.status, ExamApplication.Status.DRAFT)
            self.assertEqual(self.client.post(f"/api/v1/applications/{application.pk}/submit/", {}, format="json").status_code, 402)

            cashfree_request.return_value = {
                "order_id": order_response.data["order_id"],
                "order_amount": 75.0,
                "order_currency": "INR",
                "order_status": "PAID",
            }
            with patch("exams.tasks.send_exam_application_confirmation_email.delay"):
                with patch("exams.tasks.send_exam_payment_confirmation_email.delay") as payment_email:
                    with self.captureOnCommitCallbacks(execute=True):
                        verification = self.client.post("/api/v1/payments/verify/", {
                            "order_id": order_response.data["order_id"],
                        }, format="json")
                payment_email.assert_called_once()

        self.assertEqual(verification.status_code, 200, verification.data)
        self.assertTrue(verification.data["paid"])
        application.refresh_from_db()
        self.assertEqual(application.status, ExamApplication.Status.SUBMITTED)
        self.assertEqual(application.cashfree_payments.get().status, CashfreeExamPayment.Status.PAID)

    @override_settings(CASHFREE_SECRET_KEY="test-webhook-secret")
    def test_cashfree_webhook_requires_a_valid_signature_and_confirms_payment(self):
        student = User.objects.create_user("webhook-student@example.com", email="webhook-student@example.com")
        profile = StudentProfile.objects.create(user=student, class_name="10")
        self.exam.fee = "25.00"
        self.exam.save(update_fields=["fee"])
        application = ExamApplication.objects.create(
            exam=self.exam,
            student=profile,
            full_name="Webhook Student",
            email=student.email,
            phone="9876543210",
            date_of_birth="2010-05-12",
            class_name="10",
        )
        payment = CashfreeExamPayment.objects.create(
            application=application,
            order_id="hbpl-webhook-test",
            payment_session_id="session-test",
            amount="25.00",
        )
        payload = json.dumps({"data": {
            "order": {"order_id": payment.order_id},
            "payment": {"payment_status": "SUCCESS", "cf_payment_id": "cf-test-1"},
        }}).encode()
        timestamp = "1720000000"
        valid_signature = base64.b64encode(
            hmac.new(b"test-webhook-secret", timestamp.encode() + payload, hashlib.sha256).digest(),
        ).decode()

        invalid = self.client.post(
            "/api/v1/cashfree/webhook/", data=payload, content_type="application/json",
            HTTP_X_WEBHOOK_SIGNATURE="invalid", HTTP_X_WEBHOOK_TIMESTAMP=timestamp,
        )
        self.assertEqual(invalid.status_code, 400)

        with patch("exams.api._cashfree_request", return_value={
            "order_id": payment.order_id, "order_amount": 25.0,
            "order_currency": "INR", "order_status": "PAID",
        }), patch("exams.tasks.send_exam_application_confirmation_email.delay"), patch("exams.tasks.send_exam_payment_confirmation_email.delay") as payment_email:
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(
                    "/api/v1/cashfree/webhook/", data=payload, content_type="application/json",
                    HTTP_X_WEBHOOK_SIGNATURE=valid_signature, HTTP_X_WEBHOOK_TIMESTAMP=timestamp,
                )
        payment_email.assert_called_once()

        self.assertEqual(response.status_code, 200, response.data)
        payment.refresh_from_db()
        application.refresh_from_db()
        self.assertEqual(payment.status, CashfreeExamPayment.Status.PAID)
        self.assertEqual(payment.cf_payment_id, "cf-test-1")
        self.assertEqual(application.status, ExamApplication.Status.SUBMITTED)

    def test_payment_confirmation_email_contains_receipt_details_and_is_idempotent(self):
        student = User.objects.create_user("receipt@example.com", email="receipt@example.com")
        profile = StudentProfile.objects.create(user=student)
        application = ExamApplication.objects.create(
            exam=self.exam,
            student=profile,
            application_number="HBPL26-00102",
            full_name="Receipt Student",
            email=student.email,
        )
        payment = CashfreeExamPayment.objects.create(
            application=application,
            order_id="order-receipt-test",
            payment_session_id="private-session",
            amount="125.00",
            status=CashfreeExamPayment.Status.PAID,
            cf_payment_id="cf-receipt-test",
            paid_at=timezone.now(),
        )

        with patch("exams.tasks.send_templated_email", return_value=1) as send_email:
            self.assertEqual(send_exam_payment_confirmation_email.run(payment.pk), "sent")
            self.assertEqual(send_exam_payment_confirmation_email.run(payment.pk), "already-sent")

        payment.refresh_from_db()
        self.assertIsNotNone(payment.payment_confirmation_email_sent_at)
        self.assertEqual(payment.payment_confirmation_email_last_error, "")
        send_email.assert_called_once()
        self.assertEqual(send_email.call_args.kwargs["recipients"], [student.email])
        self.assertEqual(send_email.call_args.kwargs["template_name"], "core/emails/exam_payment_received")
        self.assertEqual(send_email.call_args.kwargs["context"]["amount"], "INR 125.00")
        self.assertEqual(send_email.call_args.kwargs["context"]["payment_reference"], "cf-receipt-test")

    def test_staff_can_accept_manual_payment_with_audit_and_email(self):
        student = User.objects.create_user("manual-payment@example.com", email="manual-payment@example.com")
        profile = StudentProfile.objects.create(user=student, class_name="10")
        application = ExamApplication.objects.create(
            exam=self.exam,
            student=profile,
            full_name="Manual Payment Student",
            email=student.email,
            date_of_birth="2010-05-12",
            class_name="10",
        )
        payment = CashfreeExamPayment.objects.create(
            application=application,
            order_id="order-manual-accept-test",
            payment_session_id="session-manual-test",
            amount="125.00",
            status=CashfreeExamPayment.Status.PENDING,
        )
        self.client.force_authenticate(user=self.staff)

        with patch("exams.tasks.send_exam_application_confirmation_email.delay"), patch("exams.tasks.send_exam_payment_confirmation_email.delay") as payment_email:
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(
                    f"/api/v1/staff/payments/{payment.pk}/accept/",
                    {"reference": "UPI-REF-123"}, format="json",
                )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["status"], CashfreeExamPayment.Status.PAID)
        self.assertEqual(response.data["payment_method"], CashfreeExamPayment.Method.MANUAL)
        payment.refresh_from_db()
        application.refresh_from_db()
        self.assertEqual(payment.manual_reference, "UPI-REF-123")
        self.assertEqual(payment.manually_accepted_by, self.staff)
        self.assertIsNotNone(payment.manually_accepted_at)
        self.assertEqual(application.status, ExamApplication.Status.SUBMITTED)
        event = application.events.get(event_type="payment_manually_accepted")
        self.assertEqual(event.actor, self.staff)
        self.assertIn("UPI-REF-123", event.note)
        payment_email.assert_called_once_with(payment.pk)

        duplicate = self.client.post(
            f"/api/v1/staff/payments/{payment.pk}/accept/",
            {"reference": "UPI-REF-123"}, format="json",
        )
        self.assertEqual(duplicate.status_code, 400)

    def test_staff_payment_list_shows_student_exam_and_order_details_only_to_staff(self):
        student = User.objects.create_user("payment-list@example.com", email="payment-list@example.com")
        profile = StudentProfile.objects.create(user=student)
        application = ExamApplication.objects.create(
            exam=self.exam,
            student=profile,
            application_number="HBPL26-00091",
            full_name="Payment Student",
            email=student.email,
        )
        CashfreeExamPayment.objects.create(
            application=application,
            order_id="order-ledger-test",
            payment_session_id="do-not-expose-session-token",
            amount="125.00",
            status=CashfreeExamPayment.Status.PAID,
            cf_payment_id="cf-ledger-test",
            paid_at=timezone.now(),
        )

        self.client.force_authenticate(user=self.staff)
        response = self.client.get("/api/v1/staff/payments/?status=paid&search=Payment%20Student")

        self.assertEqual(response.status_code, 200)
        payment_row = response.data[0] if isinstance(response.data, list) else response.data["results"][0]
        self.assertEqual(payment_row["application_number"], "HBPL26-00091")
        self.assertEqual(payment_row["student_name"], "Payment Student")
        self.assertEqual(payment_row["exam_name"], self.exam.name)
        self.assertEqual(payment_row["order_id"], "order-ledger-test")
        self.assertEqual(payment_row["cf_payment_id"], "cf-ledger-test")
        self.assertNotIn("payment_session_id", payment_row)

        self.client.force_authenticate(user=student)
        self.assertEqual(self.client.get("/api/v1/staff/payments/").status_code, 403)

    def test_staff_can_create_exam_and_transition_application(self):
        self.client.force_authenticate(user=self.staff)
        session_response = self.client.post("/api/v1/staff/exam-sessions/", {
            "code": "next-session", "name": "2027-28",
        }, format="json")
        self.assertEqual(session_response.status_code, 201)

        exam_response = self.client.post("/api/v1/staff/exams/", {
            "session_id": session_response.data["id"],
            "name": "Second Examination",
            "is_published": True,
        }, format="json")
        self.assertEqual(exam_response.status_code, 201)
        self.assertEqual(exam_response.data["session"]["id"], session_response.data["id"])

    def test_exam_centre_is_assigned_to_each_student_exam_enrollment(self):
        self.client.force_authenticate(user=self.staff)
        north = ExamCentre.objects.create(name="North School", address="North address")
        south = ExamCentre.objects.create(name="South School", address="South address")
        self.exam.centres.add(north, south)

        enrollments = []
        for index, centre in enumerate((north, south), start=1):
            user = User.objects.create_user(f"candidate{index}@example.com")
            profile = StudentProfile.objects.create(user=user)
            enrollment = ExamApplication.objects.create(
                exam=self.exam,
                student=profile,
                full_name=f"Candidate {index}",
                email=user.email,
            )
            response = self.client.patch(
                f"/api/v1/staff/applications/{enrollment.pk}/",
                {"centre_id": centre.pk},
                format="json",
            )
            self.assertEqual(response.status_code, 200)
            enrollments.append(ExamApplication.objects.get(pk=enrollment.pk))

        self.assertEqual([item.centre_id for item in enrollments], [north.pk, south.pk])

    def test_staff_can_auto_assign_approved_applications_within_centre_capacity(self):
        self.client.force_authenticate(user=self.staff)
        north = ExamCentre.objects.create(name="North Hall", address="North", capacity=1)
        south = ExamCentre.objects.create(name="South Hall", address="South", capacity=2)
        self.exam.centres.add(north, south)
        already_assigned = ExamApplication.objects.create(
            exam=self.exam,
            student=StudentProfile.objects.create(user=User.objects.create_user("placed@example.com")),
            full_name="Already Placed",
            status=ExamApplication.Status.APPROVED,
            centre=north,
        )
        unassigned = [
            ExamApplication.objects.create(
                exam=self.exam,
                student=StudentProfile.objects.create(user=User.objects.create_user(f"approved{index}@example.com")),
                full_name=f"Approved {index}",
                status=ExamApplication.Status.APPROVED,
            )
            for index in range(3)
        ]

        response = self.client.post(
            "/api/v1/staff/applications/auto-assign-centres/",
            {"exam_id": self.exam.pk},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"assigned": 2, "unassigned": 1})
        already_assigned.refresh_from_db()
        self.assertEqual(already_assigned.centre_id, north.pk)
        assigned_centres = dict(ExamApplication.objects.filter(pk__in=[item.pk for item in unassigned]).values_list("pk", "centre_id"))
        self.assertTrue(all(assigned_centres[item.pk] == south.pk for item in unassigned[:2]))
        self.assertIsNone(assigned_centres[unassigned[2].pk])
        self.assertEqual(ApplicationEvent.objects.filter(event_type="centre_assigned", actor=self.staff).count(), 2)

    def test_staff_can_upload_exam_document_templates(self):
        self.client.force_authenticate(user=self.staff)
        admit_template = SimpleUploadedFile("admit-template.pdf", b"%PDF-1.4 admit", content_type="application/pdf")
        certificate_template = SimpleUploadedFile("certificate-template.pdf", b"%PDF-1.4 certificate", content_type="application/pdf")
        response = self.client.patch(
            f"/api/v1/staff/exams/{self.exam.id}/",
            {"admit_card_template": admit_template, "certificate_template": certificate_template},
            format="multipart",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("admit_card_template", response.data)
        self.assertIn("certificate_template", response.data)
        self.assertTrue(Exam.objects.get(pk=self.exam.id).admit_card_template.name)
        self.assertTrue(Exam.objects.get(pk=self.exam.id).certificate_template.name)

        html_template = SimpleUploadedFile(
            "admit-template.html", b"<html>{{ student_name }}</html>", content_type="text/html",
        )
        response = self.client.patch(
            f"/api/v1/staff/exams/{self.exam.id}/",
            {"admit_card_template": html_template},
            format="multipart",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(Exam.objects.get(pk=self.exam.id).admit_card_template.name.endswith(".html"))

    def test_staff_can_upload_html_certificate_template(self):
        self.client.force_authenticate(user=self.staff)
        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            template = SimpleUploadedFile(
                "certificate-template.html", b"<html>{{ student_name }}</html>", content_type="text/html",
            )
            response = self.client.patch(
                f"/api/v1/staff/exams/{self.exam.id}/",
                {"certificate_template": template},
                format="multipart",
            )
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.data["certificate_template"].endswith(".html"))

    def test_student_eligibility_and_session_result_history(self):
        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            register = self.client.post("/api/v1/auth/register/", registration_data("eligible@example.com"), format="multipart")
        self.assertEqual(register.status_code, 201)
        StudentProfile.objects.filter(user__email="eligible@example.com").update(email_verified=True, class_name="Class 10")
        login = self.client.post("/api/v1/auth/login/", {
            "email": "eligible@example.com",
            "password": "ValidPass123!",
        }, format="json")
        self.assertEqual(login.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {login.data['token']}")

        self.exam.allowed_classes = ["10"]
        self.exam.status = Exam.Status.RESULT_OUT
        self.exam.save(update_fields=["allowed_classes", "status"])
        ineligible = Exam.objects.create(
            session=self.session, code="class-9-only", slug="class-9-only", name="Class 9 Only",
            status=Exam.Status.REGISTRATION_OPEN, is_published=True,
            allowed_classes=["9"],
        )

        eligible = self.client.get("/api/v1/eligible-exams/")
        self.assertEqual(eligible.status_code, 200)
        self.assertEqual([item["id"] for item in eligible.data], [self.exam.id])

        application = ExamApplication.objects.create(
            exam=self.exam,
            student=StudentProfile.objects.get(user__email="eligible@example.com"),
            full_name="Eligible Student",
            date_of_birth="2010-01-01",
            class_name="Class 10",
            email="eligible@example.com",
        )
        ExamResult.objects.create(
            exam=self.exam, application=application, obtained_marks=80, total_marks=100,
            percentage=80, rank=1, grade="A", is_pass=True,
        )
        results = self.client.get("/api/v1/results/?session={}".format(self.session.id))
        self.assertEqual(results.status_code, 200)
        self.assertEqual(results.data[0]["application_number"], None)
        self.assertEqual(results.data[0]["session_id"], self.session.id)
        self.assertNotIn(ineligible.id, [item["id"] for item in eligible.data])
