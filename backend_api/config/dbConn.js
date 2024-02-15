const mongoose=require('mongoose');

const connectDB=async ()=>{
    try{
        await mongoose.connect('mongodb+srv://jainutkarshsv26:cSdvnlwV46FMzt7x@cluster0.nvzm92x.mongodb.net/?retryWrites=true&w=majority');
    }catch(err){
        console.error(err);
    }
}

module.exports=connectDB;