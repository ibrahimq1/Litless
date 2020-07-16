// Testing

var clientData = "";
fetch("../clientData.json")
  .then(response => response.json())
  .then((json) => {
  clientData = json;
  length = clientData.table.length - 1;




var apiData = "";
fetch("../apitData.json")
  .then(response => response.json())
  .then((json2) => {
  apiData = json2;
  
//filter it
  lengthClient = clientData.table.length - 1; 
  lengthApi = apiData.table.length - 1;

  //console.log(lengthApi);
  //console.log(lengthClient);

    ApiData = apiData;
    //console.log(ApiData.table[lengthApi]);
    


    document.getElementById("tag").innerHTML = JSON.stringify(ApiData.table[lengthApi])
    

 }).catch(errors => console.error(errors));


}).catch(errors => console.error(errors));



// drag and drop
function readURL(input) {
  if (input.files && input.files[0]) {

    var reader = new FileReader();

    reader.onload = function(e) {
      $('.image-upload-wrap').hide();

      $('.file-upload-image').attr('src', e.target.result);
      $('.file-upload-content').show();

      $('.image-title').html(input.files[0].name);
    };

    reader.readAsDataURL(input.files[0]);

  } else {
    removeUpload();
  }
}

// remove upload
function removeUpload() {
  $('.file-upload-input').replaceWith($('.file-upload-input').clone());
  $('.file-upload-content').hide();
  $('.image-upload-wrap').show();
}
$('.image-upload-wrap').bind('dragover', function () {
        $('.image-upload-wrap').addClass('image-dropping');
    });
    $('.image-upload-wrap').bind('dragleave', function () {
        $('.image-upload-wrap').removeClass('image-dropping');
});

// media 
const constraints =  { "video": { width: { exact: 320 }}};
var videoTag = document.getElementById('video-tag');
var imageTag = document.getElementById('image-tag');
var imageCapturer;

function start() {
  navigator.mediaDevices.getUserMedia(constraints)
    .then(gotMedia)
    .catch(e => { console.error('getUserMedia() failed: ', e); });
}

function gotMedia(mediastream) {
  videoTag.srcObject = mediastream;
  document.getElementById('start').disabled = true;
  
  var videoTrack = mediastream.getVideoTracks()[0];
  imageCapturer = new ImageCapture(videoTrack);
  
}

function takePhoto() {
  imageCapturer.takePhoto()
    .then((blob) => {
      console.log("Photo taken: " + blob.type + ", " + blob.size + "B")
      imageTag.src = URL.createObjectURL(blob);
    })
    .catch((err) => { 
      console.error("takePhoto() failed: ", e);
    });
}

// geolocation
var geocoder;

function initialize() {
  geocoder = new google.maps.Geocoder();
  if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(successFunction, errorFunction);
  } 
}

//Get the latitude and the longitude;
function successFunction(position) {
var lat = position.coords.latitude;
var lng = position.coords.longitude;
codeLatLng(lat, lng)
}

function errorFunction(){
alert("Geocoder failed");
}

function codeLatLng(lat, lng) {

var latlng = new google.maps.LatLng(lat, lng);
geocoder.geocode({'latLng': latlng}, function(results, status) {
  if (status == google.maps.GeocoderStatus.OK) {
  console.log(results)
    if (results[1]) {
     //formatted address
     alert(results[0].formatted_address)
    //find country name
        for (var i=0; i<results[0].address_components.length; i++) {
        for (var b=0;b<results[0].address_components[i].types.length;b++) {

        //there are different types that might hold a city admin_area_lvl_1 usually does in come cases looking for sublocality type will be more appropriate
            if (results[0].address_components[i].types[b] == "administrative_area_level_1") {
                //this is the object you are looking for
                city= results[0].address_components[i];
                break;
            }
        }
    }
    //city data
    alert(city.short_name + " " + city.long_name)


    } else {
      alert("No results found");
    }
  } else {
    alert("Geocoder failed due to: " + status);
  }
});
}
