const multer = require('multer');
const path   = require('path');


/** Storage Engine */
const storageEngine = multer.diskStorage({
  destination: './public/files',
  filename: function(req, file, fn){
    fn(null,  new Date().getTime().toString()+'-'+file.fieldname+path.extname(file.originalname));
  }
}); 


//init
const bankUpload =  multer({
    storage: storageEngine,
    limits: { fileSize:7 * 1024 * 1024 },
    fileFilter: function(req, file, callback){
      validateBankFile(file, callback);
    }
  }).array('file');
  
  var validateBankFile = function(file, cb ){
    allowedFileTypes = pdf
    const extension = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeType  = allowedFileTypes.test(file.mimetype);
    if(extension && mimeType){
      return cb(null, true);
    }else{
      cb("Invalid file type. Only PDF files are allowed.")
    }
  }

  module.exports = bankUpload;