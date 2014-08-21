exports = module.exports = function(options){
  var self = this;
  return function(item, done) {
    this.log.info('Parsed item:');
    this.log.info(JSON.stringify(item, null, '  '));
    done();
  };
}
