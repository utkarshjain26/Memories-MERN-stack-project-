const mongoose=require('mongoose');
const {Schema,model}=mongoose;

const PostSchema=new Schema({
    public:Boolean,
    title:String,
    summary:String,
    content:String,
    cover:String,
    author:{type:Schema.Types.ObjectId ,ref:'User'},
    comments:[{type: Schema.Types.ObjectId, ref:'Comment'}],
    likes:[{type:Schema.Types.ObjectId, ref:'Like'}],
},{
    timestamps:true
})

const PostModel=model('Post',PostSchema);

module.exports=PostModel;