const {expect} = require('chai');

const {LibResolver}         = require('ts/toolchain/resolver').__test__;
const {StripPrefixResolver} = require('ts/toolchain/resolver').__test__;


describe('LibResolver', () => {
  let resolver;

  beforeEach(() => {
    resolver = new LibResolver({
      '/lib_one/a.ts': undefined,
      '/lib_two/a.ts': undefined,
      '/lib_two/b.ts': undefined,
      '/nested/lib_one/a.ts': undefined,
      '/nested/lib_two/a.ts': undefined,
      '/nested/lib_two/b.ts': undefined,
      '/oops/super/nested/with/only/one/file.ts': undefined,
    });
  })

  describe('fileExists', () => {

    it('should know when a file exists', () => {
      expect(resolver.fileExists('/lib_one/a.ts')).to.be.true;
    });

    it('should know when a file does not exist', () => {
      expect(resolver.fileExists('/nonsense.ts')).to.be.false;
      expect(resolver.fileExists('/lib_one')).to.be.false;
    });

  });

  describe('directoryExists', () => {
    it('should know when a directory exists', () => {
      expect(resolver.directoryExists('/')).to.be.true;
      expect(resolver.directoryExists('/lib_one')).to.be.true;
      expect(resolver.directoryExists('/lib_two')).to.be.true;
      expect(resolver.directoryExists('/nested')).to.be.true;
      expect(resolver.directoryExists('/nested/lib_one')).to.be.true;
      expect(resolver.directoryExists('/nested/lib_two')).to.be.true;
      expect(resolver.directoryExists('/oops')).to.be.true;
      expect(resolver.directoryExists('/oops/super/nested')).to.be.true;
    });

    it('should know when a directory does not exist', () => {
      expect(resolver.fileExists('/nonsense')).to.be.false;
    });
  });

  describe('getDirectories', () => {

    it('should list existing directories', () => {
      expect(resolver.getDirectories('/'))
        .to.have.members(['lib_one', 'lib_two', 'nested', 'oops']);

      expect(resolver.getDirectories('/lib_one')).to.be.empty;
      expect(resolver.getDirectories('/lib_two')).to.be.empty;

      expect(resolver.getDirectories('/nested'))
        .to.have.members(['lib_one', 'lib_two']);

      expect(resolver.getDirectories('/oops'))
        .to.have.members(['super']);

      expect(resolver.getDirectories('/oops/super/nested/with/only/one'))
        .to.be.empty;
    });

    it('should give undefined for non-existant directories', () => {
      expect(resolver.getDirectories('yikes')).to.be.undefined;
    });
  });
});


describe('StripPrefixResolver', () => {
  let resolver;

  beforeEach(() => {
    const root = new LibResolver({
      '/lib_one/a.ts': undefined,
      '/lib_two/a.ts': undefined,
      '/lib_two/b.ts': undefined,
      '/nested/lib_one/a.ts': undefined,
      '/nested/lib_two/a.ts': undefined,
      '/nested/lib_two/b.ts': undefined,
      '/oops/super/nested/with/only/one/file.ts': undefined,
    });
    resolver = new StripPrefixResolver("/etc/node_modules", root);
  });

  describe('fileExists', () => {

    it('should know when a file exists', () => {
      expect(resolver.fileExists('/etc/node_modules/lib_one/a.ts')).to.be.true;
    });

    it('should know when a file does not exist', () => {
      expect(resolver.fileExists('/nonsense.ts')).to.be.false;
      expect(resolver.fileExists('/etc/node_modules/nonsense.ts')).to.be.false;
      expect(resolver.fileExists('/lib_one/a.ts')).to.be.false;
    });
  });

  describe('directoryExists', () => {
    it('should know when a directory exists', () => {
      expect(resolver.directoryExists('/')).to.be.true;
      expect(resolver.directoryExists('/etc')).to.be.true;
      expect(resolver.directoryExists('/etc/node_modules')).to.be.true;
      expect(resolver.directoryExists('/etc/node_modules/oops')).to.be.true;
    });

    it('should know when a directory does not exist', () => {
      expect(resolver.fileExists('/nonsense')).to.be.false;
      expect(resolver.fileExists('/lib_one')).to.be.false;
    });
  });

  describe('getDirectories', () => {

    it('should list existing directories', () => {
      expect(resolver.getDirectories('/')).to.have.members(['etc']);
      expect(resolver.getDirectories('/etc')).to.have.members(['node_modules']);
      expect(resolver.getDirectories('/etc/node_modules'))
        .to.have.members(['lib_one', 'lib_two', 'nested', 'oops']);

      expect(resolver.getDirectories('/etc/node_modules/nested'))
        .to.have.members(['lib_one', 'lib_two']);
    });

    it('should not list missing directories', () => {
      expect(resolver.getDirectories('/nonsense')).to.be.undefined;
      expect(resolver.getDirectories('/etc/node_modules/hi')).to.be.undefined;
    })

  });
});
