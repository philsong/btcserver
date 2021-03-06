var Crawler = require("crawler").Crawler;
var urls = [];
var fs= require('fs');
var times  = 0;
var cronJob = require('cron').CronJob;
var job = new cronJob({
  // cronTime: '00 30 09 * * 1-7',
  cronTime: '0 0 */2 * * *', //every 2 hours
  onTick: function() {
    makelove();
  },
  start: true,
  timeZone: "Asia/Chongqing"
});

job.start();


var c = new Crawler({
	"maxConnections": 1,	
});


function writeFs(urls){
	var data = {"news": urls };
    fs.writeFile("yibite.json", JSON.stringify(data), function (err) {
	  	if (err) throw err;
	  	console.log('It\'s saved!');
	});
}

/*
 * mongodb
*/

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.connect('mongodb://mactive:mengqian@localhost/bitcoin');

var newsSchema = Schema({
  title   	: String,
  url 	  	: String,
  time 		: Date,
  origin 	: String,
  intro 	: String,
  no 		: String,
  aid		: Number,
  content	: String
});


var News = mongoose.model('News', newsSchema);

// News.remove({}, function(err) { 
//    console.log('News collection removed');
// });

function getContent(aid, callback){

	var aid = parseInt(aid);
	
	News
	.findOne({'aid': aid })
	.exec(function (err, item) {
		// body..
		callback(err, item);
	});
}

function saveMongoDB(urls){
	urls.forEach(function(item){

		var nameList = item.url.split("aid=");
		var aid = nameList[1];

		getContent(aid, function(err, result){
			console.log("aid:" + aid);
			// console.log(item);

			if (result != null) {
				console.log("has this "+result.aid)
			}else{
				console.log("queue");

				/// queue single page
				c.queue([{
					"uri": item.url,
					"jQuery": true,

					// The global callback won't be called
					"callback":function(error,result,$) {

					    var _content = $('.art-content')[0].innerHTML;
					    console.log("====");
					    // console.log(_content);
					    item.content = _content;
						item.aid = aid;


						item.url = "http://www.ydkcar.com/btcnow/content?aid="+aid

						console.log(item.url);
					    
					    // get content
						var oneNew = new News( item );
						oneNew.save(function (err) {
						  if (err) // ...
						  console.log('insert error');
						});

					}
				}]);
				/// queue single page

			}
		});
	});
}


function makelove(){
	// Queue just one URL, with default callback
	var tasks = [];
	var max = 1;
	for (var i = 1; i <= max; i++) {
		tasks.push({
			"maxConnections": 1,
			"uri": "http://yibite.com/news/index.php?page="+i,
			"callback": function(error,result,$) {
				urls = [];

				$('.li-holder').each( function(index, div){
					var timeDiv = $(div).find('.tags > span.time')[0];
					var linkDiv = $(div).find('.right-intro > a.art-myTitle')[0];
					var originDiv = $(div).find('.tags > a.author')[0];
					var introDiv = $(div).find('.right-intro > span.intro')[0];

					urls.push({
			        	url: linkDiv.href,
			        	title: linkDiv.innerHTML,
			        	time: timeDiv.innerHTML,
			        	origin: originDiv.innerHTML,
			        	intro: introDiv.innerHTML,
			        	no: "page"+times+"-"+index
			        });
					console.log("page"+times+"-"+index);
				});

			    times += 1;
			    console.log('queue call '+times+' times');
		    	// writeFs(urls);
		    	saveMongoDB(urls);
			}
		});
	};

	console.dir(tasks);

	c.queue(tasks);
}

// TODO crawler pagination url
// TODO	insert the data
// TODO check the repeat
// TODO 定时任务