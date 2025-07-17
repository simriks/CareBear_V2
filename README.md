Inspiration
Every year, over 3 million seniors in North America are hospitalized due to falls many of which become life-threatening simply because help arrives too late. We were deeply moved by this issue, especially after learning from senior care staff that many centers are understaffed and can't monitor everyone at all times. We wanted to create a solution that could work in any home or care facility — something discreet, proactive, and affordable.

What it does
Care Bear is an Android-based fall detection system with a caregiver monitoring dashboard. It detects when a senior has fallen using motion sensors on a smartphone, then sends a real-time alert to a central web server that caregivers can monitor. It also includes an AI assistant that responds to voice queries and provides medication reminders offering both safety and companionship. The hardware is disguised inside a teddy bear to make the system more approachable and non-intrusive.

How we built it
We developed a custom Android app that uses the camera feed to detect falls in real time.
When a fall is detected, the app sends a signal to a Firebase-connected web server, where a dashboard displays alerts to caregivers.
The system includes a voice based AI assistant (built using speech-to-text and simple NLP) that helps with medication tracking and answers questions.
All tech components are hidden inside a teddy bear to remove the stigma and make the solution comforting rather than clinical.
Challenges we ran into
We originally planned to use a Raspberry Pi for in-room monitoring, but we couldn’t get one in time due to supply issues. This forced us to adapt quickly and build the system around an Android phone instead.
Integrating real-time fall detection without false positives was difficult tuning sensor thresholds and handling orientation changes took time.
We also had to build a smooth communication flow between the mobile app and the caregiver dashboard with minimal latency.
Accomplishments that we're proud of
Building a fully working demo with real-time sensor tracking and server communication in under 48 hours.
Creating a solution that’s not only functional but also emotionally thoughtful from the teddy bear housing to the AI companion.
Learning new technologies like Android motion sensors, Firebase, and real time networking from scratch during the hackathon.
What we learned
How to interpret accelerometer/gyroscope data to detect motion patterns and falls.
How to set up two-way communication between a mobile app and a web server.
How to make tech feel human first, blending empathy into interface and design.
What's next for Care Bear
Transition the system to run on a Raspberry Pi with a camera and/or motion sensors for passive room monitoring.
Expand the AI assistant’s functionality using more advanced NLP models and medical reminders.
Build out caregiver roles into the dashboard allowing multiple patients to be monitored at once.
Partner with care homes or senior organizations to pilot real-world use and gather feedback.
NOTE: To run the github, you need to get your machine's local IP address. That is the only way the website will work. Make sure to run both GitHub projects. One is the Android side, and one is the server side.
