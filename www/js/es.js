var equipListStr = 'Ball, Driver, Irons, Putter, FairwayWood, PitchingWedge, GapWedge, SandWedge, GolfBag, Glove, Hat, Shirt, Shoes, TournYear, Grips, ShaftsIrons, HybridWood, GripsWoods, RangeFinder, PushCart, Bottoms';

//this code runs only once for each page (only the first time each page is loaded)
$(document).on('pageinit', function(){
	//upload page
	$('#ESUploadTxt').val('');
});

//this code runs on every page load
$(document).on('pageshow', function(){
	pageID = $.mobile.activePage.attr('id');
	if (pageID == 'divSurvey') {
		$('.surveyRow:not(:first)').find('.ui-btn').css('border-top','none');	
	} else if (pageID == 'divList') {
		showStatusList();
	}
});

//get tournament list and populate the select element
function downloadTournaments() {
	logging('BEGIN downloadTournaments()');
	if (!commTest()) {
		alert('There is no Internet connection!\nPlease make sure you are connected to WiFi.');
        logging('There is no Internet connection!\nPlease make sure you are connected to WiFi.')
		return false;
	}
	
	//populate local tourny table with data from server
	var db = getLocalDB();
    logging('BEGIN getScript es-tlist.asp');
    $.getScript('http://www.ajga.org/json/es-tlist.asp', function(){
        logging('BEGIN DB transaction');
        db.transaction(function(tx){

            //drop tlist table if there is one already
            tx.executeSql('DROP TABLE IF EXISTS TList',[],function(tx){

                //then create table again with up-to-date data from server
                tx.executeSql('CREATE TABLE IF NOT EXISTS TList (TID, TName)',[], function(tx){
                    //loop through tournament list from server and insert each one in local db
                    $(TList).each(function(index, value){
                        tx.executeSql('INSERT INTO TList (TID, TName) VALUES ("' + value.TID + '", "' + value.TName + '")');
                    });

                    //populate select list
                    tx.executeSql('SELECT * FROM TList', [], function(tx, qryResults){					
                        var numRows = qryResults.rows.length;
                        var dbRecords = qryResults.rows;
                        $('#sltTList').find('option').remove().end();
                        $('#sltTList').append(new Option('Select a tournament', 0));
                        $('#sltTList').val($('#sltTList option:first').val()).selectmenu('refresh');
                        for (var i=0; i<numRows; i++) {
                            var optionText = dbRecords.item(i).TID + ': ' + dbRecords.item(i).TName;
                            var optionVal = dbRecords.item(i).TID;
                            $('#sltTList').append(new Option(optionText, optionVal));
                        }
                        $('#sltTList').selectmenu('refresh');

                        //tell the user that the process is complete

                        logging('Downloaded ' + numRows + ' tournaments to local database');
                        $('#infoSetup').prepend('Tournament list downloaded <span class="infoDate">(' + getDayTime() + ')</span><br/>');
                    }, errorCallback); //populate select
                }, errorCallback); // create new table
            }, errorCallback); // drop existing table
        }); //db.transaction(function(tx){
    }); //getScript
}//END downloadTournaments


//download the field for the selected tourny criteria if the user confirms
//also download the equipment list
function downloadPlayers(){
	logging('BEGIN downloadPlayers(): verifying with user');
	if ($('#sltHNo').val() == 0 || $('#sltRNo').val() == 0 || $('#sltTList').val() == 0 || $('#sltTList').val() == null) {
		alert('Make sure all fields are complete');
	} else {
		var selectedVal = $('#sltTList').val();
		var selectedTxt = $('#sltTList option[value="' + selectedVal + '"]').text();
		selectedTxt = selectedTxt.replace($('#sltTList').val() + ': ', '');
		var confirmationTxt = 'You are about to download the field for "' + selectedTxt + '". This action will erase all equipment survey data on the device.\n\nAre you sure you want to proceed?'
		var userAnswer = confirm(confirmationTxt);
		if (userAnswer == true) {
			logging('downloadPlayers(): beginning download');
			if (commTest() != true) {
				alert('There is no Internet connection!\nPlease make sure you are connected to WiFi.');
				return false;
			}
			
			var db = getLocalDB();
			
			//populate local equipment table with data from server
			$.getScript('http://www.ajga.org/json/es-equipment.asp', function(){
				db.transaction(function(tx){
					logging('downloadPlayers(): getting equipment list from server');
					
					//drop table if it exists already
					tx.executeSql('DROP TABLE IF EXISTS EquipList',[],function(tx){
						
						//then create table again with up-to-date data from server
						tx.executeSql('CREATE TABLE IF NOT EXISTS EquipList (type, etype)',[],function(){
							
							//loop through each record from server and insert into local db
							$(equipments).each(function(index, value){
								tx.executeSql('INSERT INTO EquipList (type, etype) VALUES ("' + value.type + '", "' + value.etype + '")');
							}); //END each loop
							$('#infoSetup').prepend('Equipment list downloaded <span class="infoDate">(' + getDayTime() + ')</span><br/>');
						}, errorCallback); //create equipmentlist table
					}, errorCallback); //drop table
				}, errorCallback); //db.transaction
			}); //getScript
			
			
			//populate local player es table with data from server
			var esURL = 'http://www.ajga.org/json/es.asp?tid=' + $('#sltTList').val() + '&cno=' + $('#sltCNo').val() + '&rno=' + $('#sltRNo').val() + '&hno=' + $('#sltHNo').val();
			$.getScript(esURL, function(){
				db.transaction(function(tx){
					
					//drop table if it exists already
					tx.executeSql('DROP TABLE IF EXISTS ES',[],function(tx){
						
						//then create table again with up-to-date data from server
						tx.executeSql('CREATE TABLE ES (MID, Last_Name, First_Name, Hometown, State, Sex, TournamentID, RNo, ' + equipListStr + ', Done, Course, Start, listOrder)',[],function(tx){
							//loop through each record from server and insert into local db
							$(ESTable).each(function(index, value){
								sqlInsertStatement = 'INSERT INTO ES (MID, Last_Name, First_Name, Hometown, State, Sex, TournamentID, RNo, ' + equipListStr + ', Done, Course, Start, listOrder) VALUES ("' + 
									value.MID + '", "' +
									value.Last_Name + '", "' +
									value.First_Name + '", "' +
									value.Hometown + '", "' + 
									value.State + '", "' + 
									value.Sex + '", "' + 
									value.TournamentID + '", "' + 
									value.RNo + '", "' + 
									value.Ball + '", "' + 
									value.Driver + '", "' + 
									value.Irons + '", "' + 
									value.Putter + '", "' + 
									value.FairwayWood + '", "' + 
									value.PitchingWedge + '", "' + 
									value.GapWedge + '", "' + 
									value.SandWedge + '", "' + 
									value.GolfBag + '", "' + 
									value.Glove + '", "' + 
									value.Hat + '", "' + 
									value.Shirt + '", "' + 
									value.Shoes + '", "' + 
									value.TournYear + '", "' + 
									value.Grips + '", "' +
									value.ShaftsIrons + '", "' +
									value.HybridWood + '", "' + 
									value.GripsWoods + '", "' +
									value.RangeFinder + '", "' + 
									value.PushCart + '", "' + 
									value.Bottoms + '", "' + 
									value.Done + '", "' + 
									value.Course + '", "' + 
									value.Start + '", ' + 
									index + ')';
									
								//insert the current player into the web sql table
								tx.executeSql(sqlInsertStatement);
							}); //END each loop
							$('#infoSetup').prepend(ESTable.length + ' players downloaded <span class="infoDate">(' + getDayTime() + ')</span><br/>');
							checkESTable();
						}, errorCallback); //create table
					}); //drop table
				});//db.transaction
			}); // getScript
		} //if (userAnswer == true)
	}//if fields are complete
} //END downloadPlayers

function checkESTable(){
	var db = getLocalDB();
	db.transaction(function(tx){
		tx.executeSql("SELECT MID FROM ES", [], function(tx, qryResults){
			var numRows = qryResults.rows.length;
			logging('ES Table has ' + numRows + ' rows');
		}, errorCallback);
	});
}

function errorCallbackTest(){
  if (err){
	  logging("DB error in testing: " + err.message);
  }
  return false;
}

//If table exists then populate select, else do nothing.
function populateTeetimes() {
	logging('BEGIN populateTeetimes()');
	var db = getLocalDB();
	db.transaction(function(tx){
		tx.executeSql('SELECT DISTINCT Start FROM ES ORDER BY listOrder', [], function(tx, qryResults){
			var numRows = qryResults.rows.length;
			var dbRecords = qryResults.rows;
			$('#sltTeeTime').find('option').remove().end();
			$('#sltTeeTime').append(new Option('Select a tee time',''));
			$('#sltPlayers').find('option').remove().end();
			$('#sltPlayers').append(new Option('Select a player','')).selectmenu('refresh');
			populateEquipmentLists();
			for (var i=0; i<numRows; i++) {
				var starTime = (numRows.length > 0) ? dbRecords.item(i).Start : "All Players";
				$('#sltTeeTime').append(new Option(starTime.replace(':00 ', ' '),dbRecords.item(i).Start));
			}
			$('#sltTeeTime').selectmenu('refresh');
		}, errorCallback);
	}, errorCallback);
}//END populateTeetimes

//If table exist than populate select, if not do nothing.
function populatePlayerList() {
	logging('BEGIN populatePlayerList()');
	if ($('#sltTeeTime').val() != '0') {
		var db = getLocalDB();
		db.transaction(function(tx){
			var sqlString = "SELECT First_Name, Last_Name, MID  FROM ES WHERE Start = '" + $('#sltTeeTime').val() + "'";
			tx.executeSql(sqlString, [], function(tx, qryResults){
				var numRows = qryResults.rows.length;
				var dbRecords = qryResults.rows;
				$('#sltPlayers').find('option').remove().end();
				$('#sltPlayers').append(new Option('Select a player','0'));
				var selectOptions = '';
				for (var i=0; i<numRows; i++) {
					selectOptions = dbRecords.item(i).First_Name + ' ' + dbRecords.item(i).Last_Name;
					$('#sltPlayers').append(new Option(selectOptions,dbRecords.item(i).MID));
				}
				$('#sltPlayers').selectmenu('refresh');
			}, errorCallback);
		}, errorCallback);
	}
}//END populatePlayerList

//If table exist than populate select, if not do nothing.
function populateEquipmentLists() { 
	var db = getLocalDB();
	db.transaction(function(tx){
		tx.executeSql('SELECT * FROM EquipList', [], function(tx, qryResults){
			var numRows = qryResults.rows.length;
			var dbRecords = qryResults.rows;
			var previousEType = '';
			var sltTxt, sltVal;
			for (var i=0; i<numRows; i++) {
				if (dbRecords.item(i).etype != previousEType) {
					$('#'+dbRecords.item(i).etype).find('option').remove().end().append(new Option('INCOMPLETE','0'));
				}
				sltTxt = dbRecords.item(i).type;
				$('#' + dbRecords.item(i).etype).append(new Option(sltTxt,dbRecords.item(i).type)).selectmenu('refresh');
				previousEType = dbRecords.item(i).etype;
			}
			$('#btnWSUpdate').buttonMarkup({icon:'plus'}).find('.ui-btn-text').html('Save');
		}, errorCallback);
	}, errorCallback);
} // prePopulateTeeTimeList

//if player has previous results, popultae the new survey with them
function populateSurvey() {
	if ($('#sltPlayers').val() > 0) {
		var db = getLocalDB();
		db.transaction(function(tx){
			tx.executeSql("SELECT * FROM ES WHERE MID = '" + $('#sltPlayers').val() + "'", [], function(tx, qryResults){
				var numRows = qryResults.rows.length;
				var dbRecord = qryResults.rows.item(0);
				$('#Ball').val(dbRecord.Ball).attr('selected', true).selectmenu('refresh');
				$('#Driver').val(dbRecord.Driver).attr('selected', true).selectmenu('refresh');
				$('#Irons').val(dbRecord.Irons).attr('selected', true).selectmenu('refresh');
				$('#Putter').val(dbRecord.Putter).attr('selected', true).selectmenu('refresh');
				$('#FairwayWood').val(dbRecord.FairwayWood).attr('selected', true).selectmenu('refresh');
				$('#PitchingWedge').val(dbRecord.PitchingWedge).attr('selected', true).selectmenu('refresh');
				$('#GapWedge').val(dbRecord.GapWedge).attr('selected', true).selectmenu('refresh');
				$('#SandWedge').val(dbRecord.SandWedge).attr('selected', true).selectmenu('refresh');
				$('#GolfBag').val(dbRecord.GolfBag).attr('selected', true).selectmenu('refresh');
				$('#Glove').val(dbRecord.Glove).attr('selected', true).selectmenu('refresh');
				$('#Hat').val(dbRecord.Hat).attr('selected', true).selectmenu('refresh');
				$('#Shirt').val(dbRecord.Shirt).attr('selected', true).selectmenu('refresh');
				$('#Shoes').val(dbRecord.Shoes).attr('selected', true).selectmenu('refresh');
				$('#Grips').val(dbRecord.Grips).attr('selected', true).selectmenu('refresh');
				$('#ShaftsIrons').val(dbRecord.ShaftsIrons).attr('selected', true).selectmenu('refresh');
				$('#HybridWood').val(dbRecord.HybridWood).attr('selected', true).selectmenu('refresh');
				$('#GripsWoods').val(dbRecord.GripsWoods).attr('selected', true).selectmenu('refresh');
				$('#RangeFinder').val(dbRecord.RangeFinder).attr('selected', true).selectmenu('refresh');
				$('#PushCart').val(dbRecord.PushCart).attr('selected', true).selectmenu('refresh');
				$('#Bottoms').val(dbRecord.Bottoms).attr('selected', true).selectmenu('refresh');
				if (dbRecord.Done == '1') {
					$('#btnWSUpdate').buttonMarkup({icon:'check'}).show().find('.ui-btn-text').html('Done');
				} else {
					$('#btnWSUpdate').buttonMarkup({icon:'plus'}).show().find('.ui-btn-text').html('Save');	
				}
			}, errorCallback);
		}, errorCallback);
	} else {
		alert('Please select a player');
	}
}//END prePopulateTeeTimeList

//If table exist then populate select, if not do nothing.
function saveSurveyToLocalDB() {
	var playerSelects = $('#fsPlayerESInfo select');
	var missingField = 0;
	playerSelects.each(function(index){
		if ($(this).val() == '0' || $(this).val() == null) {
			if (missingField == 0) {
				alert('At least ' + $(this).attr('id') + ' is missing');
			}
			missingField += 1;
		}
	});
	if (missingField == 0) {
		var db = getLocalDB();
		db.transaction(function(tx){
			
		var playerSelects = $('#fsPlayerESInfo select');
		var sqlUpdateTxt = 'UPDATE ES SET ';
		sqlUpdateTxt += chkNull('Ball');
		sqlUpdateTxt += chkNull('Driver');
		sqlUpdateTxt += chkNull('Irons');
		sqlUpdateTxt += chkNull('Putter');
		sqlUpdateTxt += chkNull('FairwayWood');
		sqlUpdateTxt += chkNull('PitchingWedge');
		sqlUpdateTxt += chkNull('GapWedge');
		sqlUpdateTxt += chkNull('SandWedge');
		sqlUpdateTxt += chkNull('GolfBag');
		sqlUpdateTxt += chkNull('Glove');
		sqlUpdateTxt += chkNull('Hat');
		sqlUpdateTxt += chkNull('Shirt');
		sqlUpdateTxt += chkNull('Shoes');
		sqlUpdateTxt += chkNull('Grips');
		sqlUpdateTxt += chkNull('ShaftsIrons');
		sqlUpdateTxt += chkNull('HybridWood');
		sqlUpdateTxt += chkNull('GripsWoods');
		sqlUpdateTxt += chkNull('RangeFinder');
		sqlUpdateTxt += chkNull('PushCart');
		sqlUpdateTxt += chkNull('Bottoms');
		sqlUpdateTxt += "Done = '1'  WHERE MID = '" + $('#sltPlayers').val() + "'";
		tx.executeSql(sqlUpdateTxt, [], function(){
			$('#btnWSUpdate').buttonMarkup({icon:'check'}).show().find('.ui-btn-text').html('Done');
		});
		}, errorCallback);
	}

} // END saveSurveyToLocalDB

//If table exist than populate select, if not do nothing.
function showStatusList() {
	var db = getLocalDB();
	db.transaction(function(tx){
		tx.executeSql("SELECT MID, Last_Name, First_Name, Start, Done FROM ES ORDER BY Done ASC, listOrder ASC, Last_Name, First_Name", [], function(tx, qryResults){
			var numRows = qryResults.rows.length;
			var dbRecords = qryResults.rows;
			var status = '';
			var tdTxt = '';
			$('#tblESList').html('');
			for (var i=0; i<numRows;i++) {
				if (dbRecords.item(i).Done == '1'){
					status = 'Complete';
				} else {
					status = 'Incomplete';
				}
				tdTxt = '<tr class="'+status+'"><td width="50%">'+dbRecords.item(i).First_Name + ' ' + dbRecords.item(i).Last_Name+'</td><td width="25%">'+dbRecords.item(i).Start+'</td><td width="25%">'+status+'</td></tr>';
				$('#tblESList').append(tdTxt);
			}
			$('.Incomplete:last td').css('border-bottom', '2px solid #ac1a2f');
		}, errorCallback);
	}, errorCallback);
} // END showStatusList


//If table exists then populate select, else do nothing.
var getUpdatedRecordsSql = "SELECT MID, Last_Name, First_Name, Hometown, State, Sex, TournamentID, RNo, " + equipListStr + " FROM ES WHERE Done = '1'";
function initSurveyUpload() {
	if (commTest() == false) {
		alert('There is no Internet connection!\nPlease make sure you are connected to WiFi.');
		return false;
	} else {
		var db = getLocalDB();
		db.transaction(function(tx){
			tx.executeSql(getUpdatedRecordsSql, [], function(tx,qryResults){
				uploadTxt = getSurveysDataStr(tx, qryResults);
				$('#ESUploadTxt').val(uploadTxt);
			}, errorCallback);
		}, errorCallback);
	}
} // END initSurveyUpload

//make sure upload is valid
function confirmUpload(){
	if (commTest() == false) {
		alert('There is no Internet connection!\nPlease make sure you are connected to WiFi.');
		return false;
	} else if ($('#ESUploadTxt').val() == '') {
		alert('Please tap [Prep for upload] first.');
		return false;
	} else {
		var db = getLocalDB(), incompleteCount = 0;
		db.transaction(function(tx){
			tx.executeSql("SELECT COUNT(MID) AS IncompleteCount FROM ES WHERE Done <> '1'", [], function(tx,qryResults){
				incompleteCount = qryResults.rows.item(0).IncompleteCount;
				if (incompleteCount > 0){
					if (confirm('There are ' + incompleteCount + ' incomplete surveys on this device. Continue with upload?')){
						uploadSurveys()
					}
				} else {
					uploadSurveys()
				}
			}, errorCallback);
		}, errorCallback);
	}
	
	backupCurrentData(true);
} // END formPost

//upload the ES data to the server
function uploadSurveys(){
	$.post('http://www.ajga.org/es/esupdate.asp',$('#formESUpload').serialize(),function(data){
		$('#h2PostResult').prepend(data + ' <span class="infoDate">(' + getDayTime() + ')</span><br/>');
	}).error(function() {
		$('#divPostDebug').prepend('Error during upload - post.error <span class="infoDate">(' + getDayTime() + ')</span><br/>');
		$('#h2PostResult').prepend('Error during upload - post.error <span class="infoDate">(' + getDayTime() + ')</span><br/>');
	});
}

//save current data to backup table on server (in string form)
//if hideMsg = true, this will be done without notification to user
function backupCurrentData(hideMsg) { 
	if (commTest() == false) {
		alert('There is no Internet connection!\nPlease make sure you are connected to WiFi.');
		return false;
	}
	var db = getLocalDB();
	db.transaction(function(tx){
		tx.executeSql(getUpdatedRecordsSql, [], function(tx,qryResults){
			backUpTxt = getSurveysDataStr(tx, qryResults);
			$('#BkData').val(backUpTxt);
			if (thisTID) {$('#TID').val(thisTID); thisTID = '';}
			$.post('http://www.ajga.org/es/esbackup.asp', $('#frmESBackUp').serialize(), function(data) {
				if (!hideMsg){
					if (data == 'Done') {
						$('#h2BKStatus').prepend('Backup Completed <span class="infoDate">(' + getDayTime() + ')</span><br/>');
					} else {
						$('#h2BKStatus').prepend('Error during backup - server <span class="infoDate">(' + getDayTime() + ')</span><br/>');
						logging('Error during backup - post.error');
					}
				}
			}).error(function() {
				logging('Error during backup - post.error');
			});
		}, errorCallback);
	});
} // END initESBackUp

//get the current ES dataset in string form
//this includes data only for players that have been updated
var thisTID;
function getSurveysDataStr(tx, qryResults) {
	var numRows = qryResults.rows.length;
	var dbRecords = qryResults.rows;
	var esDataStr = '';
	thisTID = dbRecords.item(0).TournamentID;
	for (var i=0; i<numRows; i++) {
		if (i>0) {esDataStr += '{#New#}'}
		esDataStr +=
			'MID{**}' + dbRecords.item(i).MID + '{**}' +
			'Last_Name{**}' + dbRecords.item(i).Last_Name + '{**}' +
			'First_Name{**}' + dbRecords.item(i).First_Name + '{**}' +
			'Hometown{**}' + dbRecords.item(i).Hometown + '{**}' + 
			'State{**}' + dbRecords.item(i).State + '{**}' + 
			'Sex{**}' + dbRecords.item(i).Sex + '{**}' + 
			'TournamentID{**}' + dbRecords.item(i).TournamentID + '{**}' + 
			'RNo{**}' + dbRecords.item(i).RNo + '{**}' + 
			'Ball{**}' + checkVal(dbRecords.item(i).Ball) + '{**}' + 
			'Driver{**}' + checkVal(dbRecords.item(i).Driver) + '{**}' + 
			'Irons{**}' + checkVal(dbRecords.item(i).Irons) + '{**}' + 
			'Putter{**}' + checkVal(dbRecords.item(i).Putter) + '{**}' + 
			'FairwayWood{**}' + checkVal(dbRecords.item(i).FairwayWood) + '{**}' + 
			'PitchingWedge{**}' + checkVal(dbRecords.item(i).PitchingWedge) + '{**}' + 
			'GapWedge{**}' + checkVal(dbRecords.item(i).GapWedge) + '{**}' + 
			'SandWedge{**}' + checkVal(dbRecords.item(i).SandWedge) + '{**}' + 
			'GolfBag{**}' + checkVal(dbRecords.item(i).GolfBag) + '{**}' + 
			'Glove{**}' + checkVal(dbRecords.item(i).Glove) + '{**}' + 
			'Hat{**}' + checkVal(dbRecords.item(i).Hat) + '{**}' + 
			'Shirt{**}' + checkVal(dbRecords.item(i).Shirt) + '{**}' + 
			'Shoes{**}' + checkVal(dbRecords.item(i).Shoes) + '{**}' + 
			'TournYear{**}' + dbRecords.item(i).TournYear + '{**}' + 
			'Grips{**}' + checkVal(dbRecords.item(i).Grips) + '{**}' + 
			'ShaftsIrons{**}' + checkVal(dbRecords.item(i).ShaftsIrons) + '{**}' +
			'HybridWood{**}' + checkVal(dbRecords.item(i).HybridWood) + '{**}' + 
			'GripsWoods{**}' + checkVal(dbRecords.item(i).GripsWoods) + '{**}' +
			'RangeFinder{**}' + checkVal(dbRecords.item(i).RangeFinder) + '{**}' + 
			'PushCart{**}' + checkVal(dbRecords.item(i).PushCart) + '{**}' +
			'Bottoms{**}' + checkVal(dbRecords.item(i).Bottoms) + ''
			;
	}
	return esDataStr;
} //END getSurveysDataStr

//get the current count of surveys that are on the device and incomplete
function getIncompleteCount(tx, qryResults) {
	var dbRecords = qryResults.rows.item(0);
} //END getIncompleteCount

///////////////////////////////////////
// utility functions
///////////////////////////////////////

//Get the web sql db. If it doesn't exist, create it first
function checkVal(x) {
	if (x == '0') {
		return '';
	} else {
		return x;
	}
} //END checkVal

function chkNull(fid) {
	fidVal = $('#'+fid).val();
	if (fidVal != '' && fidVal != null && fidVal != '0') {
		return fid + " = '" + fidVal + "', ";
	} else {
		alert(fid + ' is missing');
		return false;
	}
} // END chkNull

//return the local ES database (will be created it if doesn't yet exist)
function getLocalDB(){
	return window.openDatabase("ESdb", "1.0", "Equipment Survey", 3*2014*2014);
} //END getLocalDB

function errorCallback(tx, err) {
  if (err){
	  logging("DB error: " + err.message);
  }
  return false;
} //END errorCallback

function logging(x){
	$('#processLogs').prepend('\n' + getDayTime() + ': ' + x.toString());
} //END logging

//return true if there is connectivity
function commTest(){
	//computer testing will only work on chrome
	if (navigator.appVersion.indexOf('Chrome') >= 0){
		return true;
	}
	
    var networkState = navigator.connection.type;
    var states = {};
    states[0]  = 'Unknown connection';
    states[1]  = 'Ethernet connection';
    states[2]  = 'WiFi connection';
    states[3]  = 'Cell 2G connection';
    states[4]  = 'Cell 3G connection';
    states[5]  = 'Cell 4G connection';
    states[6]  = 'Bad - No network connection';

    return states[networkState].indexOf('Bad') < 0;
	
} //END commTest{
	
function debugModeSlider(divDesID, divSourceID){
	var divDes = $('#'+divDesID);
	var divSource = $('#'+divSourceID);
	switch (divSource.val()){
		case 'on':
			divDes.show();
			break;
		case 'off':
			divDes.hide();
			break;
	}
} //END debugModeSlider

//return time in format 'Mon. at 2:39 pm'
function getDayTime(){
	weekday=new Array(7);
	weekday[0]="Sun";
	weekday[1]="Mon";
	weekday[2]="Tue";
	weekday[3]="Wed";
	weekday[4]="Thu";
	weekday[5]="Fri";
	weekday[6]="Sat";
	
	d = new Date();
    thisDay = weekday[d.getDay()];
    thisHour = d.getHours();
	thisAMPM = 'am';
	if (thisHour >= 12) {thisAMPM = 'pm'}
	if (thisHour > 12){thisHour = thisHour - 12}
    thisMinute = d.getMinutes();
	if (thisMinute < 10){thisMinute = '0' + thisMinute}
	
    return (thisDay + ' at ' + thisHour + ':' + thisMinute + ' ' + thisAMPM);
} //END getDayTime
