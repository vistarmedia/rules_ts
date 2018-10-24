const {expect} = require('chai');

const {LRU} = require('./lru.js');


describe("LRU", () => {

  let lru;

  describe("basically", () => {

    beforeEach(() => {
      lru = new LRU(10);
    });

    it("should not have a non-existant key", () => {
      expect(lru.hasKey("Weirdo")).to.be.false;
    });

    it("should have an existanting key", () => {
      lru.set("Weirdo", 666);
      expect(lru.hasKey("Weirdo")).to.be.true;
    });

    it("should not have a value for a a non-existant key", () => {
      expect(lru.get("Weirdo")).to.not.exist;
    });

    it("should set a key", () => {
      expect(lru.hasKey("key")).to.be.false;
      lru.set("key", 5);
      expect(lru.hasKey("key")).to.be.true;
    });

    it("should get a value from a key", () => {
      expect(lru.get("key")).to.not.exist;
      lru.set("key", 5);
      expect(lru.get("key")).to.equal(5);
    });
  });

  describe("with a size of 3", () => {

    beforeEach(() => {
      lru = new LRU(3);
    });

    describe("when empty", () => {

      it("should retain 3 values", () => {
        lru.set("a", 1);
        lru.set("b", 2);
        lru.set("c", 3);

        expect(lru.get("a")).to.equal(1);
        expect(lru.get("b")).to.equal(2);
        expect(lru.get("c")).to.equal(3);
      });

    });

    describe("when full", () => {

      beforeEach(() => {
        lru = new LRU(3);
        lru.set("a", 1);
        lru.set("b", 2);
        lru.set("c", 3);
      });

      it('should have 3 keys in LRU order', () => {
        expect(lru._keys).to.deep.equal(["c", "b", "a"]);
      });

      it('should promote a key when read', () => {
        expect(lru.get("b")).to.equal(2);
        expect(lru._keys).to.deep.equal(["b", "c", "a"]);
      });

      it('should expire a key', () => {
        lru.set("d", 4);
        expect(lru._keys).to.deep.equal(["d", "c", "b"]);
        expect(lru.hasKey("a")).to.be.false;
        expect(lru.get("a")).to.be.undefined;
      });
    });

  });

});
