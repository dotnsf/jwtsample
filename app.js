// app.js

var express = require( 'express' );
var bodyParser = require( 'body-parser' );
var jwt = require( 'jsonwebtoken' );
var session = require( 'express-session' );
var app = express();

var superSecret = 'weloveibmcloud';  //. 適当に変更してください

app.set( 'superSecret', superSecret );
app.use( express.static( __dirname + '/public' ) );  //. 静的コンテンツは /public 以下
app.use( bodyParser.urlencoded() );
app.use( bodyParser.json() );

//. Express-Session の設定
app.use( session({
  secret: superSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,           //. https で使う場合は true
    maxage: 1000 * 60 * 60   //. 60min
  }
}) );

//. ログイン処理
app.post( '/login', function( req, res ){
  res.contentType( 'application/json' );
  var id = req.body.id;
  var password = req.body.password;

  /*
   * 本来はユーザーディレクトリやマスター DB などを参照して id & password が正しいかどうかを判断する。
   * 今回は簡易的に id と password の中身が一致している場合はその id でログイン成功したものとする
   */
  if( id && id == password ){
    //. ログイン成功
    var user = { id: id, password: password };  //. トークンの素になるオブジェクト
    var token = jwt.sign( user, superSecret, { expiresIn: '25h' } );
    req.session.token = token; //. セッションに記錄

    res.redirect( '/' );
  }else{
    //. ログイン失敗
    res.redirect( '/login.html' );
  }
});

//. ログアウト
app.get( '/logout', function( req, res ){
  req.session.token = null; //. セッションをリセット
  res.redirect( '/' );
});

var items = [];  //. データ一覧（本来はデータベースなどで管理するもの、今回はメモリ処理だけで実装）

//. データ一覧取得
app.get( '/items', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  res.write( JSON.stringify( items, 2, null ) );
  res.end();
});

//. データ新規作成
app.post( '/item', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );
  var token = ( req.session && req.session.token ) ? req.session.token : null;
  if( !token ){
    res.status( 401 );
    res.write( JSON.stringify( { status: false, result: 'No token provided.' }, 2, null ) );
    res.end();
  }else{
    //. トークンをデコードして、ログイン時のユーザーオブジェクトを取りだす
    jwt.verify( token, app.get( 'superSecret' ), function( err, user ){
      if( err ){
        res.status( 401 );
        res.write( JSON.stringify( { status: false, result: 'Invalid token.' }, 2, null ) );
        res.end();
      }else{
        var item = req.body;                        //. ポストされたデータ
        item.user = user;                           //. セッションのユーザー情報をデータに含める
        item.timestamp = ( new Date() ).getTime();  //. タイムスタンプをデータに含める

        items.push( item );

        res.write( JSON.stringify( { status: true, item: item }, 2, null ) );
        res.end();
      }
    });
  }
});


var port = 3000;
app.listen( port );
console.log( 'server started on ' + port );
