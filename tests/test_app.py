from copy import deepcopy

import pytest
from fastapi.testclient import TestClient

from src.app import activities, app


@pytest.fixture(autouse=True)
def restore_activities():
    original_activities = deepcopy(activities)
    yield
    activities.clear()
    activities.update(original_activities)


@pytest.fixture
def client():
    return TestClient(app, follow_redirects=False)


def test_root_redirects_to_static_index(client):
    """Given the API app, when the root is requested, then it redirects to the static index."""
    response = client.get("/")

    assert response.status_code == 307
    assert response.headers["location"] == "/static/index.html"


def test_get_activities_returns_activity_details(client):
    """Given the initial activity data, when activities are requested, then their details are returned."""
    response = client.get("/activities")

    assert response.status_code == 200
    activities_response = response.json()
    assert "Chess Club" in activities_response
    assert activities_response["Chess Club"]["description"]
    assert activities_response["Chess Club"]["schedule"]
    assert activities_response["Chess Club"]["max_participants"] == 12
    assert "michael@mergington.edu" in activities_response["Chess Club"]["participants"]


def test_signup_adds_student_to_activity(client):
    """Given an existing activity and a new email, when the student signs up, then they are added."""
    email = "new.student@mergington.edu"

    response = client.post(
        "/activities/Chess%20Club/signup",
        params={"email": email},
    )

    assert response.status_code == 200
    assert response.json() == {"message": f"Signed up {email} for Chess Club"}
    assert email in activities["Chess Club"]["participants"]


def test_signup_returns_404_for_unknown_activity(client):
    """Given an unknown activity, when a student signs up, then the API returns 404."""
    response = client.post(
        "/activities/Unknown%20Club/signup",
        params={"email": "new.student@mergington.edu"},
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Activity not found"}


def test_signup_returns_409_for_existing_participant(client):
    """Given an already registered student, when they sign up again, then the API returns 409."""
    response = client.post(
        "/activities/Chess%20Club/signup",
        params={"email": "michael@mergington.edu"},
    )

    assert response.status_code == 409
    assert response.json() == {
        "detail": "Student already signed up for this activity"
    }


def test_cancel_signup_removes_student_from_activity(client):
    """Given a registered student, when they cancel, then they are removed from the activity."""
    email = "michael@mergington.edu"

    response = client.delete(
        "/activities/Chess%20Club/signup",
        params={"email": email},
    )

    assert response.status_code == 200
    assert response.json() == {"message": f"Unregistered {email} from Chess Club"}
    assert email not in activities["Chess Club"]["participants"]


def test_cancel_signup_returns_404_for_unknown_activity(client):
    """Given an unknown activity, when a student cancels, then the API returns 404."""
    response = client.delete(
        "/activities/Unknown%20Club/signup",
        params={"email": "new.student@mergington.edu"},
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Activity not found"}


def test_cancel_signup_returns_404_for_unregistered_student(client):
    """Given a student not registered for an activity, when they cancel, then the API returns 404."""
    response = client.delete(
        "/activities/Chess%20Club/signup",
        params={"email": "new.student@mergington.edu"},
    )

    assert response.status_code == 404
    assert response.json() == {
        "detail": "Student is not signed up for this activity"
    }