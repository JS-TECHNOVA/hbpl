from django import forms

from api.models import TeamRegistration, ExamRegistration


class TeamRegistrationForm(forms.ModelForm):
    class Meta:
        model = TeamRegistration
        fields = [
            "team_name",
            "captain_name",
            "email",
            "phone",
            "player_count",
            "message",
        ]
        widgets = {
            "message": forms.Textarea(attrs={"rows": 4}),
        }

    def clean_player_count(self):
        player_count = self.cleaned_data["player_count"]
        if not 11 <= player_count <= 15:
            raise forms.ValidationError("Squad must have 11 to 15 players.")
        return player_count

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields.values():
            field.widget.attrs.setdefault(
                "class",
                "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none",
            )


class ExamRegistrationForm(forms.ModelForm):
    class Meta:
        model = ExamRegistration
        fields = [
            "full_name",
            "roll_number",
            "date_of_birth",
            "phone",
            "email",
            "school_name",
            "class_name",
            "address",
        ]
        widgets = {
            "date_of_birth": forms.DateInput(attrs={"type": "date"}),
            "address": forms.Textarea(attrs={"rows": 3}),
        }

    def clean_roll_number(self):
        return self.cleaned_data["roll_number"].strip().upper()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["roll_number"].required = False
        for field in self.fields.values():
            field.widget.attrs.setdefault(
                "class",
                "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none",
            )


class ExamResultLookupForm(forms.Form):
    roll_number = forms.CharField(max_length=50)
    date_of_birth = forms.DateField(widget=forms.DateInput(attrs={"type": "date"}))

    def clean_roll_number(self):
        return self.cleaned_data["roll_number"].strip().upper()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields.values():
            field.widget.attrs.setdefault(
                "class",
                "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none",
            )
