"""
Management command: python manage.py seed_data

Populates the database with all initial HBPL data.
Running it multiple times is safe — it uses get_or_create.
"""
from django.core.management.base import BaseCommand
from api.models import Team, Match, ManagementMember, GalleryImage, Volunteer


TEAMS = [
    {
        "name": "Eleven Star Cricket Club - Imilia",
        "captain": "O. P. Sahani",
        "description": "A passionate team from Imilia led by O. P. Sahani, known for strong teamwork and consistency.",
    },
    {
        "name": "Tufan Cricket Club",
        "captain": "Pawan Kushwaha",
        "description": "An energetic and competitive side captained by Pawan Kushwaha, known for their fearless playstyle.",
    },
    {
        "name": "Raj Cricket Club - Tamkuhi Raj",
        "captain": "Hasan Ansari",
        "description": "A disciplined and strategic team from Tamkuhi Raj, guided by captain Hasan Ansari.",
    },
    {
        "name": "Maa Maha Maya Cricket Club - Surajpur Kerta",
        "captain": "Guddu Kushwaha",
        "description": "Representing Surajpur Kerta, this club combines youthful energy and local talent under Guddu Kushwaha's leadership.",
    },
    {
        "name": "Crazy Eleven Cricket Club",
        "captain": "Ravi Shankar Das",
        "description": "A spirited and skillful team known for their passion and competitive drive.",
    },
    {
        "name": "Star Cricket Club - Kasia",
        "captain": "Niraj Singh",
        "description": "A disciplined and talented club representing Kasia with pride and energy.",
    },
    {
        "name": "Storm Riders",
        "captain": "Karan Verma",
        "description": "Fast-paced team with dynamic all-rounders.",
    },
    {
        "name": "Cobra Kings",
        "captain": "Amit Kumar",
        "description": "Strategic team with strong fielding and sharp bowling attack.",
    },
]

MATCHES_2025 = [
    {
        "stage": "League Match 1",
        "match_type": "league",
        "date": "2025-05-10",
        "venue": "HBPL Stadium",
        "team1": "Laximpur Cricket Club",
        "team2": "Crazy Eleven Cricket Club",
        "team1_score": "58/6 (8)",
        "team2_score": "49/8 (8)",
        "result": "Laximpur Cricket Club won by 9 runs",
        "player_of_match": "Ankit Yadav",
        "season": 2025,
    },
    {
        "stage": "League Match 2",
        "match_type": "league",
        "date": "2025-05-11",
        "venue": "HBPL Stadium",
        "team1": "Raj Cricket Club - Tamkuhi Raj",
        "team2": "Maa Maha Maya Cricket Club - Surajpur Kerta",
        "team1_score": "65/7 (8)",
        "team2_score": "60/9 (8)",
        "result": "Raj Cricket Club - Tamkuhi Raj won by 5 runs",
        "player_of_match": "Hasan Ansari",
        "season": 2025,
    },
    {
        "stage": "League Match 3",
        "match_type": "league",
        "date": "2025-05-12",
        "venue": "HBPL Stadium",
        "team1": "Eleven Star Cricket Club - Imilia",
        "team2": "Storm Riders",
        "team1_score": "72/6 (8)",
        "team2_score": "66/9 (8)",
        "result": "Eleven Star Cricket Club - Imilia won by 6 runs",
        "player_of_match": "O. P. Sahani",
        "season": 2025,
    },
    {
        "stage": "League Match 4",
        "match_type": "league",
        "date": "2025-05-13",
        "venue": "HBPL Stadium",
        "team1": "Star Cricket Club - Kasia",
        "team2": "Tufan Cricket Club",
        "team1_score": "51/5 (8)",
        "team2_score": "50/8 (8)",
        "result": "Star Cricket Club - Kasia won by 1 run",
        "player_of_match": "Niraj Singh",
        "season": 2025,
    },
    {
        "stage": "Semi Final 1",
        "match_type": "semi",
        "date": "2025-05-16",
        "venue": "HBPL Stadium",
        "team1": "Laximpur Cricket Club",
        "team2": "Eleven Star Cricket Club - Imilia",
        "team1_score": "62/4 (8)",
        "team2_score": "58/7 (8)",
        "result": "Laximpur Cricket Club won by 4 runs",
        "player_of_match": "Rahul Sharma",
        "season": 2025,
    },
    {
        "stage": "Semi Final 2",
        "match_type": "semi",
        "date": "2025-05-17",
        "venue": "HBPL Stadium",
        "team1": "Raj Cricket Club - Tamkuhi Raj",
        "team2": "Star Cricket Club - Kasia",
        "team1_score": "69/6 (8)",
        "team2_score": "67/9 (8)",
        "result": "Raj Cricket Club - Tamkuhi Raj won by 3 runs",
        "player_of_match": "Hasan Ansari",
        "season": 2025,
    },
    {
        "stage": "Final",
        "match_type": "final",
        "date": "2025-05-20",
        "venue": "HBPL Main Stadium",
        "team1": "Laximpur Cricket Club",
        "team2": "Raj Cricket Club - Tamkuhi Raj",
        "team1_score": "56/6 (20)",
        "team2_score": "54/8 (20)",
        "result": "Laximpur Cricket Club won HBPL 2025 by 2 runs",
        "player_of_match": "Rahul Sharma",
        "season": 2025,
    },
]

MATCHES_2026 = [
    {
        "stage": "Opening Match",
        "match_type": "league",
        "date": "2026-05-05",
        "time": "16:00",
        "venue": "HBPL Main Stadium",
        "team1": "Eleven Star Cricket Club - Imilia",
        "team2": "Tufan Cricket Club",
        "season": 2026,
    },
    {
        "stage": "League Match 2",
        "match_type": "league",
        "date": "2026-05-06",
        "time": "16:00",
        "venue": "HBPL Stadium A",
        "team1": "Raj Cricket Club - Tamkuhi Raj",
        "team2": "Maa Maha Maya Cricket Club - Surajpur Kerta",
        "season": 2026,
    },
    {
        "stage": "League Match 3",
        "match_type": "league",
        "date": "2026-05-07",
        "time": "16:00",
        "venue": "HBPL Stadium B",
        "team1": "Crazy Eleven Cricket Club",
        "team2": "Star Cricket Club - Kasia",
        "season": 2026,
    },
    {
        "stage": "League Match 4",
        "match_type": "league",
        "date": "2026-05-08",
        "time": "16:00",
        "venue": "HBPL Stadium A",
        "team1": "Storm Riders",
        "team2": "Cobra Kings",
        "season": 2026,
    },
    {
        "stage": "Semi Final 1",
        "match_type": "semi",
        "date": "2026-05-11",
        "time": "17:00",
        "venue": "HBPL Main Stadium",
        "team1": "Eleven Star Cricket Club - Imilia",
        "team2": "Raj Cricket Club - Tamkuhi Raj",
        "season": 2026,
    },
    {
        "stage": "Semi Final 2",
        "match_type": "semi",
        "date": "2026-05-12",
        "time": "17:00",
        "venue": "HBPL Main Stadium",
        "team1": "Crazy Eleven Cricket Club",
        "team2": "Storm Riders",
        "season": 2026,
    },
    {
        "stage": "Grand Final",
        "match_type": "final",
        "date": "2026-05-15",
        "time": "18:00",
        "venue": "HBPL Main Stadium (Day/Night)",
        "team1": "Winner SF1",
        "team2": "Winner SF2",
        "season": 2026,
    },
]

MANAGEMENT = [
    {
        "name": "Aloknath Kushwaha",
        "role": "Chairman",
        "description": "A dedicated leader with a Master's in Education, presently working as a Technical Supervisor at Maa Maha Maya, Ambikapur. A passionate Math and Science community educator, guiding students for CG Vyapam exams. With 15 years of cricket experience, he's played state-level trials and achieved 15 hat-tricks, including two 5-wicket overs in local tournaments.",
        "email": "rajesh@hbpl.com",
        "order": 1,
    },
    {
        "name": "Sonu Kushwaha",
        "role": "Vice Chairperson | Technical Director",
        "description": "Sonu Kushwaha, Vice Chairperson and Technical Director of HBPL, holds a B.Tech in Computer Science Engineering and an M.Tech in Artificial Intelligence, showcasing his expertise in advanced technologies. He is the CEO and Co-Founder of JS Technova and JS Technova Institute and also serves as Assistant Professor in CSE at BBD University, Lucknow, guiding and mentoring future engineers.",
        "email": "priya@hbpl.com",
        "order": 2,
    },
    {
        "name": "Pawan Kushwaha",
        "role": "CEO of HBPL",
        "description": "Now, meet the man who drives the engine of HBPL forward — our CEO, Mr. Pawan Kushwaha! A Mechanical Engineer (B.Tech) with expertise in machinery and project handling, he ensures smooth execution, performance, and innovation in every part of the league. Under his leadership, HBPL moves with precision and power — just like a well-tuned machine.",
        "email": "pawan@hbpl.com",
        "order": 3,
    },
    {
        "name": "Harendra Kushwaha",
        "role": "Facilities Manager",
        "description": "As Facilities Manager of HBPL, Harendra Kushwaha stands out for his teamwork, planning, and dedication. A Mechanical Engineer with hands-on experience in technical projects, he applies the same discipline and focus to cricket administration—building unity, structure, and opportunity for youth in Harpur Belahi.",
        "email": "amit@hbpl.com",
        "order": 4,
    },
    {
        "name": "Sunil Kushwaha",
        "role": "Tournament Director",
        "description": "As Tournament Director of HBPL, Sunil Kushwaha stands out for his teamwork, planning, and dedication. A Mechanical Engineer with hands-on experience in technical projects, he applies the same discipline and focus to cricket administration—building unity, structure, and opportunity for youth in Harpur Belahi.",
        "email": "amit@hbpl.com",
        "order": 5,
    },
    {
        "name": "Amar Kushwaha",
        "role": "Operations Manager",
        "description": "Every successful event needs a manager who can handle challenges with a smile — and that's our Operations Manager, Mr. Amar Kushwaha! With a strong educational background and currently serving as a D.E.O at Harpur Belahi, he also works actively as a social worker, building partnerships and managing tournament funding and logistics.",
        "email": "anjali@hbpl.com",
        "order": 6,
    },
    {
        "name": "Ram Ikabal Kushwaha",
        "role": "Event Coordinator",
        "description": "Let's now welcome the creative force behind every successful event — our Event Coordinator, Mr. Ramekbal Kushwaha! An all-rounder and fast bowler for the Toofan Cricket Club, he brings years of cricketing experience and unmatched energy to organizing and coordinating events.",
        "email": "anjali@hbpl.com",
        "order": 7,
    },
    {
        "name": "Santosh Gupta",
        "role": "Chief Medical Officer",
        "description": "Next, the man who cares for the health, fitness, and well-being of every player — our Chief Medical Officer (CMO), Dr. Santosh Gupta! He is the Director of Himanshu Multispecialist Hospital and holds a BAMS degree. His dedication ensures every player performs at their best — fit, strong, and healthy.",
        "email": "Santosh@hbpl.com",
        "order": 8,
    },
    {
        "name": "Nuraalam",
        "role": "Finance & Sponsorship Head",
        "description": "Finally, meet the man who balances the numbers, manages sponsorships, and fuels the financial engine of HBPL — our Finance & Sponsorships Head, Mr. Nuraalam! An all-rounder on and off the field, and a star batsman for the Toofan Cricket Club, he ensures that HBPL continues to grow with solid support, strong partnerships, and perfect planning.",
        "email": "mohammed@hbpl.com",
        "order": 9,
    },
]

GALLERY_IMAGES = [
    {"title": "HBPL Match 1", "category": "Action"},
    {"title": "HBPL Match 2", "category": "Ceremony"},
    {"title": "HBPL Match 3", "category": "Team"},
    {"title": "HBPL Match 4", "category": "Action"},
    {"title": "HBPL Match 5", "category": "Ceremony"},
    {"title": "HBPL Match 6", "category": "Team"},
    {"title": "HBPL Match 7", "category": "Action"},
    {"title": "HBPL Match 8", "category": "Ceremony"},
    {"title": "HBPL Match 9", "category": "Team"},
    {"title": "HBPL Match 10", "category": "Action"},
    {"title": "HBPL Match 11", "category": "Ceremony"},
    {"title": "HBPL Match 12", "category": "Team"},
]

VOLUNTEERS = [
    {"name": "Subhash Kushwaha", "role": "Community Volunteer Head", "img": "/Subhash_-removebg-preview.png", "order": 1},
    {"name": "Rajkumar Gupta", "role": "Batsman", "img": "/Rajkumar gupta.jpeg", "order": 2},
    {"name": "Ravi Gupta", "role": "Batsman", "img": "/Ravi Gupta.jpeg", "order": 3},
    {"name": "Nathu Kushwaha", "role": "Mechanical Engineer & Batsman", "img": "/nathu.png", "order": 4},
    {"name": "Manjesh Kushwaha", "role": "Batsman", "img": "/manjesh_kushwaha-removebg-preview.png", "order": 5},
    {"name": "Rohit Gupta", "role": "Batsman", "img": "/rohit-removebg-preview.png", "order": 6},
    {"name": "Manu Kushwaha", "role": "Batsman", "img": "/manu1-removebg-preview (1).png", "order": 7},
    {"name": "Manu Kushwaha", "role": "All Rounder", "img": "/manu2-removebg-preview.png", "order": 8},
    {"name": "Akash", "role": "Social Worker", "img": "/Akash-removebg-preview.png", "order": 9},
    {"name": "Ankit Arya", "role": "Grounds Crew", "img": "/Ankit_Arya-removebg-preview.png", "order": 10},
    {"name": "Amit Kushwaha", "role": "Grounds Crew", "img": "/Amit-removebg-preview.png", "order": 11},
    {"name": "Anuj Gupta", "role": "Bowler", "img": "/Anuj-removebg-preview.png", "order": 12},
    {"name": "Arman", "role": "Batsman", "img": "/Arman-removebg-preview.png", "order": 13},
    {"name": "Prince Gupta", "role": "Batsman", "img": "/Prince-removebg-preview.png", "order": 14},
    {"name": "Ranjeet Pal", "role": "Social Worker", "img": "/Ranjeet_pal-removebg-preview.png", "order": 15},
    {"name": "Rustam", "role": "Social Worker", "img": "/Rustam-removebg-preview.png", "order": 16},
    {"name": "Salman", "role": "Batsman", "img": "/Salman-removebg-preview.png", "order": 17},
    {"name": "Sachin", "role": "Grounds Crew", "img": "/sachin-removebg-preview (1).png", "order": 18},
    {"name": "Shivam Gupta", "role": "Bowler", "img": "/Shivam-removebg-preview.png", "order": 19},
    {"name": "Suraj", "role": "Batsman", "img": "/Suraj-removebg-preview.png", "order": 20},
    {"name": "Viru Kushwaha", "role": "Grounds Crew", "img": "/Viru_kushwaha-removebg-preview.png", "order": 21},
    {"name": "Viru", "role": "Social Worker", "img": "/Viru-removebg-preview.png", "order": 22},
]


class Command(BaseCommand):
    help = "Seed the database with initial HBPL data (idempotent)."

    def handle(self, *args, **kwargs):
        self._seed(Team, TEAMS, ["name"], "Teams")
        self._seed_matches()
        self._seed(ManagementMember, MANAGEMENT, ["name"], "Management members")
        self._seed(GalleryImage, GALLERY_IMAGES, ["title"], "Gallery images")
        self._seed(Volunteer, VOLUNTEERS, ["name", "order"], "Volunteers")
        self.stdout.write(self.style.SUCCESS("✅  Database seeded successfully."))

    def _seed(self, model, data, lookup_fields, label):
        created = 0
        for item in data:
            lookup = {k: item[k] for k in lookup_fields}
            _, was_created = model.objects.get_or_create(**lookup, defaults=item)
            if was_created:
                created += 1
        self.stdout.write(f"  {label}: {created} created, {len(data) - created} already existed.")

    def _seed_matches(self):
        created = 0
        all_matches = MATCHES_2025 + MATCHES_2026
        for item in all_matches:
            lookup = {"stage": item["stage"], "season": item["season"]}
            _, was_created = Match.objects.get_or_create(**lookup, defaults=item)
            if was_created:
                created += 1
        total = len(all_matches)
        self.stdout.write(f"  Matches: {created} created, {total - created} already existed.")
