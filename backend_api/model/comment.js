const mongoose=require('mongoose');
const {Schema ,model}=mongoose;

const CommentSchema=new Schema({
    comAuthor: {type: Schema.Types.ObjectId, ref:'User'},
    comContent:String,
},{
    timestamps:true,
})

const CommentModel=model('Comment',CommentSchema);

module.exports=CommentModel;