// Tell typescript that 'expect' exists
describe("sanity check", () => {
    test("1 + 2 == 3", () => {
        expect(1 + 2).toBe(3);
    });
});