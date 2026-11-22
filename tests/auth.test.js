require("dotenv").config({ quiet: true });
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { app } = require("../src/app");

describe("Authentication API Integration Tests", () => {
    it("should fail validation for empty register payload", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({});

        assert.equal(res.statusCode, 400);
        assert.equal(res.body.success, false);
    });

    it("should fail validation for empty login payload", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({});

        assert.equal(res.statusCode, 400);
        assert.equal(res.body.success, false);
    });

    it("should fail password update without authentication", async () => {
        const res = await request(app)
            .patch("/api/auth/password")
            .send({ oldPassword: "123", newPassword: "456" });

        assert.equal(res.statusCode, 401);
    });
});
