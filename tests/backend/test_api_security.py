from __future__ import annotations


def test_health_and_meta_are_local_foundation(test_app) -> None:
    health = test_app.client.get("/api/v1/health")
    assert health.status_code == 200
    assert health.json()["status"] == "healthy"
    meta = test_app.client.get("/api/v1/meta").json()
    assert meta["milestone"] == 1
    assert meta["features"]["ai_production_plan"] is False


def test_mutation_requires_csrf_and_same_origin(test_app) -> None:
    payload = {
        "topic": "A local story",
        "target_duration_minutes": 3,
        "language": "en",
        "aspect_ratio": "16:9",
    }
    missing = test_app.client.post(
        "/api/v1/projects", json=payload, headers={"Origin": "http://testserver"}
    )
    assert missing.status_code == 403
    assert missing.json()["error"]["code"] == "CSRF_REJECTED"

    wrong = test_app.client.post(
        "/api/v1/projects",
        json=payload,
        headers={**test_app.csrf_headers, "Origin": "https://attacker.example"},
    )
    assert wrong.status_code == 403
    assert wrong.json()["error"]["code"] == "ORIGIN_REJECTED"


def test_untrusted_host_is_rejected(test_app) -> None:
    response = test_app.client.get("/api/v1/health", headers={"Host": "attacker.example"})
    assert response.status_code == 400


def test_unknown_body_fields_and_non_json_are_rejected(test_app) -> None:
    unknown = test_app.client.post(
        "/api/v1/projects",
        json={"topic": "Test", "unexpected": True},
        headers=test_app.csrf_headers,
    )
    assert unknown.status_code == 400
    assert unknown.json()["error"]["code"] == "INVALID_REQUEST"

    plain = test_app.client.post(
        "/api/v1/projects",
        content="topic=test",
        headers={**test_app.csrf_headers, "Content-Type": "text/plain"},
    )
    assert plain.status_code == 415
    assert plain.json()["error"]["code"] == "JSON_REQUIRED"
