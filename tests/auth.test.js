const request = require("supertest");
const app = require("../src/app");

describe("Authentication API Integration Tests", () => {
    it("should fail validation for empty register payload", async () => {
        const res = await request(app)
            .post("/auth/register")
            .send({});

        expect(res.statusCode).toEqual(400);
        expect(res.body).toHaveProperty("success", false);
    });

    it("should fail validation for empty login payload", async () => {
        const res = await request(app)
            .post("/auth/login")
            .send({});

        expect(res.statusCode).toEqual(400);
        expect(res.body).toHaveProperty("success", false);
    });

    it("should fail password update without authentication", async () => {
        const res = await request(app)
            .patch("/auth/password")
            .send({ oldPassword: "123", newPassword: "456" });

        expect(res.statusCode).toBeGreaterThanOrEqual(401);
    });
});
