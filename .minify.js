var compressor = require('node-minify');

new compressor.minify({
    type: 'gcc',
    language: 'ECMASCRIPT5',
    //type: 'uglifyjs',
    //type: 'yui-js',
    fileIn: 'src/xvalidate.js',
    fileOut: 'src/xvalidate.min.js',
    options: ['--create_source_map=src/xvalidate.min.js.map'],
    callback: function(err, min){
        console.log(err);
//        console.log(min);
    }
});