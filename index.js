const express = require("express");
const app = express();
const port = 3000;
const bodyParser = require("body-parser");
const axios = require("axios");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("Hello World, from express");
});

app.post("/api/get_distance_and_time", (req, res) => {
  let start = req.body.start;
  let end = req.body.end;
  let units =  req.body.units;

  var millis = Date.now();
  var timestamp = Math.floor(millis / 1000);


  //The distance was calculates using Haversine formula
  //This is because Google Maps Api does not provide distance over the sea
  function distance(lat1, lon1, lat2, lon2, units) {
    let unit;
    let value;
    var R = 6371; // Radius of the earth in km

    var dLat = ((lat2 - lat1) * Math.PI) / 180; // deg2rad below
    dLat = Math.round(dLat * 100) / 100;
    var dLon = ((lon2 - lon1) * Math.PI) / 180;
    dLon = Math.round(dLon * 100) / 100;
    var a = 0.5 - Math.cos(dLat) / 2 + (Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * (1 - Math.cos(dLon))) /   2;

    if(units == "metric"){
        value =  Math.floor(R * 2 * Math.asin(Math.sqrt(a)));
        unit = "km"
    }else{
        value = Math.floor(R * 2 * Math.asin(Math.sqrt(a)) * 0.6214);
        unit = "miles"
    }
    distance = {"unit": unit , "value": value};
    return distance;
  }

  //getTime difference between two timezones
  function getTimeDifference(startTimeZone, endTimeZone) {
    var sInteger = parseInt(startTimeZone);
    var eInteger = parseInt(endTimeZone);
    if (sInteger > eInteger) {
      return sInteger - eInteger;
    } else {
      return eInteger - sInteger;
    }
  }


  //get country name when give latitude and longitude
  function fetchCountry(lat, lng) {
    let url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&sensor=false&key=API_KEY`;
    return axios
      .get(url)
      .then(handleFetchCountryResponse)
      .catch(handleFetchCountryError);
  }

  function handleFetchCountryResponse(response) {
    let country;
    response.data.results.forEach(result => {
      if (result.types[0] == "country") {
        country = result.address_components[0].long_name;
      }
    });
    return country;
  }

  function handleFetchCountryError(error) {
    console.log(error);
  }

  //get timezone when give latitude and longitude
  function fetchTimeZone(lat, lng, timestamp) {
    let url = `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lng}&timestamp=${timestamp}&key=API_KEY`;
    return axios
      .get(url)
      .then(fetchTimeZoneResponse)
      .catch(fetchTimeZoneError);
  }

  function fetchTimeZoneResponse(response) {
    let resObject = response.data;
    let timezone = (resObject.rawOffset + resObject.dstOffset) / 3600;
    prefix = timezone > 0 ? "+" : "";
    return prefix + timezone;
  }

  function fetchTimeZoneError(error) {
    console.log(error);
  }


  async function initialize() {
    let startCountry = await fetchCountry(start.lat, start.lng);
    let endCountry = await fetchCountry(end.lat, end.lng);
    let startTimeZone = await fetchTimeZone(start.lat, start.lng, timestamp);
    let endTimeZone = await fetchTimeZone(end.lat, end.lng, timestamp);
    let distance = distance(start.lat, start.lng, end.lat, end.lng, units);
    let timediff = getTimeDifference(startTimeZone, endTimeZone);

    let payload = {
      start: {
        country: startCountry,
        timezone: `GMT${startTimeZone}`,
        location: { lat: start.lat, lng: start.lng }
      },
      end: {
        country: endCountry,
        timezone: `GMT${endTimeZone}`,
        location: { lat: end.lat, lng: end.lng }
      },
      distance: {
        value: `${distance.value}`,
        units: `${distance.unit}`
      },
      time_diff: {
        value: `${timediff}`,
        units: "hours"
      }
    };
    res.json(payload);
  }

  initialize();
});

app.listen(port, () =>
  console.log(`Hello world app listening on port ${port}!`)
);
