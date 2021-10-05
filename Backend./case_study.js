const { json } = require('express');
var express = require('express');
const path = require('path');
var mysql = require('mysql');
var app = express();
const AWS = require('aws-sdk')
const Fs = require('fs')

const s3 = new AWS.S3({});

var count=0;
app.use(express.urlencoded());
var connection=mysql.createConnection({
  host: 'database-1.ce5axka6iph2.us-east-1.rds.amazonaws.com',
  user: 'admin',
  password: '12345678',
  port:'3306',
  database:'case_study'
});
connection.connect(function (err) {
    if (err) throw err;
    console.log("Connected RDS");
});

app.get('/login',function (req, res){
    var username = req.param('email', null)
    var password = req.param('password', null)
    connection.query('SELECT * from User', function (error, results, fields) {
      if (error) throw error;
      var length = results.length
      test=0;
      for (i = 0; i < length; i++)
        if (results[i].User_ID === username && results[i].password === password)
          test = 1
      if (test === 1){
         id=username;
         res.sendFile('/home/ubuntu/index.html');
         console.log('LOGIN SUCESSFULL')
      }
      else
        res.end("Login Failure try again!!");
    });
    console.log('LOGIN SUCESSFULL')
});

app.get('/register',function (req, res){
    var username = req.param('email', null)
    var password = req.param('pass', null)
    console.log(username)
    console.log(password)
    connection.query("Insert into User(User_ID,password) values ('"+username+"', '"+password+"')", function (error, results, fields) {
        if (error){
            res.end('Already Registered')
        }
    console.log('Registration SUCESSFULL')
    res.end('Registration Succcesfull')
     });
});

app.get('/submit',function (req, res){
    var text = req.param('text',null)
    var voice = req.param('voice',null)
    console.log(text)
    console.log(voice)
    count=count+1;
    connection.query("Insert into Textmp3(count,text) values ("+count+",'"+text+"')", function (error, results, fields) {
        if (error) throw error
        console.log('Instered from main page')

        const Polly = new AWS.Polly({
            signatureVersion: 'v4',
            region: 'us-east-1'
        });

        let params = {
            'Text': ""+text+"",
            'OutputFormat': 'mp3',
            'VoiceId': ""+voice+""
        }

        Polly.synthesizeSpeech(params, (err, data) => {
            if (err) {
                console.log(err.code)
            } else if (data) {
                if (data.AudioStream instanceof Buffer) {
                    Fs.writeFile("./makeMEspeak_"+count+".mp3", data.AudioStream, function(err) {
                        if (err) {
                                res.end('Voice not avalilable')
                            return console.log(err)
                        }
                        console.log("The file was saved!")
                        var t="./makeMEspeak_"+count+".mp3";
                        const fileContent = Fs.readFileSync(t);
                        const params = {
                            Bucket: 'balajicasestudy',
                            Key: "file"+count+"",
                            Body: fileContent
                        };
                        s3.upload(params, function(err, data) {
                            if (err) {
                                throw err;
                            }
                            console.log("File uploaded successfully.");
                            var link="https://balajicasestudy.s3.amazonaws.com/file"+count+"";
                            res.end("<html><body><a href="+link+">Click here</a> to Download<body><html>")
                        });
                    });
                }
            }
        });
      });
});

app.listen(8080);
