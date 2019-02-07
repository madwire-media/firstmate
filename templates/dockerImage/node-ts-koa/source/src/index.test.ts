// Tell typescript that 'expect' exists
import * as request from "supertest";
import app from "./app";

describe("GET /", () => {
    test("should return 200 OK", () => {
        return request(app.callback()).get("/")
            .expect(200);
    });

    test("should be cheezy", () => {
        return request(app.callback()).get("/")
            .then((response) => {
                expect(response.body).not.toBe("Hello world!");
            });
    });
});
