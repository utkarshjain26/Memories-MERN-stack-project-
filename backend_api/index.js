const express=require('express');
const mongoose=require('mongoose');
const app=express();
const PORT=process.env.PORT || 4000;
const cors=require('cors');
const connectDB=require('./config/dbConn');
const User=require('./model/user');
const Post=require('./model/post');
const Comment=require('./model/comment');
const UserModel = require('./model/user');
const bcrypt=require('bcrypt');
const saltRound=10;
const jwt=require('jsonwebtoken');
const secret='d75ba2a445afb34ac6c0f9764010c0b37682cf735b0323e13c0b37381f9fdc4a44d8004bbf8904b9262c8e921754473b41acfeb6f5ad73a50955c51de7cf3e05';
const cookieParser=require('cookie-parser');
const path=require('path');
const fs=require('fs');
const multer=require('multer');
const uploadMiddleware=multer({dest:'uploads/'})
const {format} =require('date-fns');

app.use(cookieParser());

app.use(cors({credentials:true,origin:'http://localhost:3000'}));
connectDB();

app.use(express.json());
app.use(express.urlencoded({extended:false}));
app.use('/uploads',express.static(path.join(__dirname,'/uploads'))); 

app.get('/',(req,res)=>{
    console.log(path.join(__dirname,'index.html'));
    res.sendFile(path.join(__dirname,'index.html'));
})
app.post('/register', async (req,res)=>{
    const {username,email,password} =req.body;
    try{
        const salt=await bcrypt.genSalt(saltRound);
        const passwordHash=await bcrypt.hash(`${password}`,`${salt}`);
        const userDoc=await User.create({username,email,password:passwordHash});
        res.json(userDoc);
    }catch(err){
        console.log(err);
        res.status(400).send(err);
    }
});

app.post('/login', async (req,res)=>{
    const {username,password} =req.body;
    const userDoc=await User.findOne({username});  
    if(!userDoc) return res.status(400).send('Register first');
    console.log(`${password}`);
    console.log(userDoc.password);
    const passcheck=await bcrypt.compare(`${password}`,userDoc.password);
    if(passcheck){
        const token=jwt.sign(
            {username,id:userDoc._id},
            secret,
            {}
            // what happens if we put expiresIn parameter here, does token automatically get destroyed or what?
            // yeah token get invalid but the cookie will not get deleted automatically
        );
        return res.cookie('token',token).json({username,id:username._id});
    }else{
        return res.sendStatus(400);
    }
    res.json(userDoc);
});

app.get('/profile',(req,res)=>{
    const {token}=req.cookies;
    if(!token) res.json(null);
    jwt.verify(token,secret,{},(err,info)=>{
        if(err) throw err;
        res.json(info);
    })
})

app.post('/logout',(req,res)=>{
    res.cookie('token','').json('ok');
})

app.post('/post',uploadMiddleware.single('file'),async(req,res)=>{
    const {public,title,summary,content}=req.body;
    const {originalname,path}=req.file;
    const parts=originalname.split('.');
    const ext=parts[parts.length-1];
    const newpath=path+'.'+ext;
    fs.renameSync(path,newpath);

    const {token}=req.cookies;
    jwt.verify(token,secret,{},async (err,info)=>{
        if(err) throw err;
        await Post.create({
            public,
            title,
            summary,
            content,
            cover:newpath,
            author:info.id,
            comments:[],
            likes:[]
        })
        res.json('ok');
    })
})


// IMPORTANT PORTION
app.put('/post',uploadMiddleware.single('file'),async(req,res)=>{
    let newpath=null;
    if(req.file){
        const {originalname,path}=req.file;
        const parts=originalname.split('.');
        const ext=parts[parts.length-1];
        newpath=path+'.'+ext;
        fs.renameSync(path,newpath);
    }
    
    const {token}=req.cookies;
    jwt.verify(token,secret,{},async (err,info)=>{
        if(err) throw err;
        const {id,public,title,summary,content}=req.body;
        const postDoc=await Post.findById(id);
        const isAuthor=JSON.stringify(info.id)===JSON.stringify(postDoc.author);
        if(!isAuthor){
            return res.status(400).send('not valid user');
        }
        await postDoc.updateOne({
            $set: {
                public: public ? public : postDoc.public,
                title,
                summary,
                content,
                cover: newpath ? newpath : postDoc.cover,
                author: info.id,
                comments: postDoc.comments 
            }
        })
        res.json('ok');
    })
})



app.get('/explore',async (req,res)=>{
    const postDoc= await Post.find({public:true})
    .populate('author',['username'])
    .sort({createdAt:-1})
    .limit(20)
    res.json(postDoc);
})

app.get('/post',async (req,res)=>{
    const {public,title,summary,content}=req.body;
    const {token}=req.cookies;
    jwt.verify(token,secret,{},async (err,info)=>{
        if(err) throw err;
        
        res.json(await Post.find({author:info.id})
        .populate('author',['username'])
        .sort({createdAt:-1})
        .limit(20)
        );
    })

    
})
app.delete('/post/:id',async (req,res)=>{
    const {id}=req.params;
    const {token}=req.cookies;
    jwt.verify(token,secret,{},async (err,info)=>{
        if(err) throw err;
        const postDoc=await Post.findById(id);
        const isAuthor=JSON.stringify(info.id)===JSON.stringify(postDoc.author);
        if(!isAuthor){
            return res.status(400).send('not valid user');
        }
        await Comment.deleteMany({ _id: { $in: postDoc.comments } });
        await Post.deleteOne({ _id: id });
        res.status(200).json('ok');
    })
})

app.delete('/post/:id/:cid',async (req,res)=>{
    const {id,cid}=req.params;
    const {token}=req.cookies;
    jwt.verify(token,secret,{},async (err,info)=>{
        if(err) throw err;
        const postDoc=await Post.findById(id);
        const comm=await Comment.findById(cid);
        const isAuthor=JSON.stringify(info.id)===JSON.stringify(comm.comAuthor._id);
        if(!isAuthor){
            return res.status(400).send('not valid user');
        }
        await Comment.deleteOne(comm._id);
        postDoc.comments.pull(comm._id);
        await postDoc.save();
        res.status(200).json('ok');
    })
})

app.post('/post/:id/like',async(req,res)=>{
    const {like}=req.body;
    const {id}=req.params;
    const {token}=req.cookies;
    if(!token) return res.status(401).json('login first');
    jwt.verify(token,secret,{},async(err,info)=>{
        if(err) throw err;
        const postDoc=await Post.findById(id);
        if(like==='true'){
            postDoc.likes.push(info.id);
        }else{
            postDoc.likes.pull(info.id);
        }
        await postDoc.save();
        res.status(200).json('ok');
    })
})

app.post('/post/:id',async (req,res)=>{
    const {comment}=req.body;
    const {id}=req.params;
    const {token}=req.cookies;
    if(!token) return res.status(401).json('login first');
    jwt.verify(token,secret,{},async (err,info)=>{
        if(err) throw err;
        const postDoc=await Post.findById(id);
        const newComment= await Comment.create({
            comAuthor:info.id,
            comContent:comment,
        })
        postDoc.comments.push(newComment);
        await postDoc.save();
        res.status(200).json('ok');
    })
})



app.get('/post/:id',async (req,res)=>{
    const {id}=req.params;
    const postDoc=await Post.findById(id)
                        .populate('author',['username'])
                        .populate({
                            path: 'comments',
                            model: 'Comment', // The model to use for populating the 'comments' field
                            populate: {
                              path: 'comAuthor',
                              model: 'User', 
                              select: 'username', // The model to use for populating the 'comAuthor' field in the 'comments' array
                            },
                        });
    res.json(postDoc);
})



mongoose.connection.once('open',()=>{
    app.listen(PORT ,()=>{console.log('Server is running at PORT 4000')});
})


