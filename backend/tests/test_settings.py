"""Tests for GET /settings and PATCH /settings endpoints."""


def test_get_settings_unauthenticated(client):
    res = client.get("/settings")
    assert res.status_code == 401


def test_get_settings_returns_tone(logged_in_client):
    res = logged_in_client.get("/settings")
    assert res.status_code == 200
    data = res.json()
    assert "tone_instructions" in data
    assert data["tone_instructions"] == ""


def test_patch_settings_updates_tone(logged_in_client):
    res = logged_in_client.patch(
        "/settings", json={"tone_instructions": "Always be friendly and upbeat."}
    )
    assert res.status_code == 200

    get_res = logged_in_client.get("/settings")
    assert get_res.json()["tone_instructions"] == "Always be friendly and upbeat."


def test_patch_settings_trims_to_500_chars(logged_in_client):
    long_text = "A" * 600
    res = logged_in_client.patch("/settings", json={"tone_instructions": long_text})
    assert res.status_code == 200

    get_res = logged_in_client.get("/settings")
    assert len(get_res.json()["tone_instructions"]) == 500


def test_patch_settings_clear_tone(logged_in_client):
    logged_in_client.patch("/settings", json={"tone_instructions": "Some instructions"})
    res = logged_in_client.patch("/settings", json={"tone_instructions": ""})
    assert res.status_code == 200

    get_res = logged_in_client.get("/settings")
    assert get_res.json()["tone_instructions"] == ""


def test_patch_settings_unauthenticated(client):
    res = client.patch("/settings", json={"tone_instructions": "test"})
    assert res.status_code == 401
