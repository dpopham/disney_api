
// Include required components
const express         = require('express')
const bodyParser      = require('body-parser')
const Themeparks      = require('themeparks')
const winston         = require('winston')
const app             = express()
const swaggerUi       = require('swagger-ui-express')
const swaggerDocument = require('./swagger.json')

// Basic configuration
const site       = "https://disney.darrenpopham.com"
const port       = process.env.PORT || 3000
const server_url = process.env.server_url || (site + "/api")

// Logging config
const myformat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp(),
    winston.format.align(),
    winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
);
const consoleTransport = new winston.transports.Console({ format: myformat })
const myWinstonOptions = {
    transports: [consoleTransport]
}
const logger = new winston.createLogger(myWinstonOptions)

function logRequest(req, res, next) {
    logger.info(req.url)
    next()
}
app.use(logRequest)


// caching database location
Themeparks.Settings.Cache = __dirname + "/themeparks.db";


// Limit number of parks from the list of available parks in the themeparks component
const AllowedParks = ["WaltDisneyWorldMagicKingdom", 
                      "WaltDisneyWorldEpcot",
                      "WaltDisneyWorldHollywoodStudios",
                      "WaltDisneyWorldAnimalKingdom",
                      "DisneylandResortMagicKingdom",
                      "DisneylandResortCaliforniaAdventure",
                      "DisneylandParisMagicKingdom",
                      "DisneylandParisWaltDisneyStudios",
                      "HongKongDisneyland",
                      "ShanghaiDisneyResortMagicKingdom",
                      "TokyoDisneyResortMagicKingdom",
                      "TokyoDisneyResortDisneySea"]
                      
// Verify parkis in allowed list                      
function allowed_park(park) {
    if (AllowedParks.indexOf(park) > -1) {
        return true
    }
    return false
}



// Build the park pbjects
const Parks = {};
const Rides = {};
const OpeningTimes = {};
for (const park in Themeparks.Parks) {
    if (allowed_park(park)) {
        Parks[park] = new Themeparks.Parks[park];
        OpeningTimes[park] = {}
    }
}


//*******************************************************
// DYNAMIC TIMER FUNCTIONS
// runs on a regular timer interval
//*******************************************************
for (var i = 0; i < AllowedParks.length; i++) {
    var park = AllowedParks[i];
    var code = "function CheckWaitTimes_" + park + "() {" +
    "Parks['" + park + "'].GetWaitTimes().then((rideTimes) => {" +
    "rideTimes.forEach((ride) => {" +
    "Rides[ride.id] = ride" +
    "})" +
    "}).catch((error) => {" +
    "console.error(error)" +
    "}).then(() => {" +
    "setTimeout(CheckWaitTimes_" + park + ", 1000 * 60 * 5)" +
    "})" +
    "}";
    eval(code);
    code = "CheckWaitTimes_" + park + "();";
    eval(code);

    code = "function CheckOpeningTimes_" + park + "() {" +
    "Parks['" + park + "'].GetOpeningTimes().then((openingTimes) => {" +
    "openingTimes.forEach((openingTime) => {" +
    "if (openingTime && openingTime.date) {" +
    "OpeningTimes['" + park + "'][openingTime.date] = openingTime" +
    "}" +
    "})" +
    "}).catch((error) => {" +
    "console.error('oogie: ' + error);" +
    "}).then(() => {" +
    "setTimeout(CheckOpeningTimes_" + park + ", 1000 * 60 * 60 * 8)" + 
    "})" +
    "}";
    eval(code);

    code = "CheckOpeningTimes_" + park + "();";
    eval(code);
}




//*******************************************************
// COMMON TOOLS
//*******************************************************
function make_url(req, path) {
    return (server_url || req.protocol + "://" + req.get('host')) + path
}
function make_response_header(req, self_item, parent_item) {
    var resp = {
                    "this":   make_url(req, self_item),
                    "parent": make_url(req, parent_item)
               }
    if (parent_item != "/parks" && self_item != "/parks") {
        resp.parks = make_url(req, "/parks")
    }
    return resp
}
function make_footer(size) {
    var d = new Date();
    return {
        "count": size,
        "total": size,
        "now": d.toISOString(),
        "disclaimer": "Web Service © 2020 Darren Popham",
        "moreinfo": site
    }
}
function get_symbol_item(object, symbol) {
    for (var i = 0; i < Object.getOwnPropertySymbols(object).length; i++) {
        if (String(Object.getOwnPropertySymbols(object)[i]) == 'Symbol(' + symbol + ')') {
            return object[Object.getOwnPropertySymbols(object)[i]]
        }
    }
    return null
}


//*******************************************************
// ROOT /api
//*******************************************************
app.get('/api', (req, res) => {
    let resp = {
        "_links" : {
            "this": make_url(req, "/")
        },
        "_embedded": {
            "items": [
                {
                    "name": "Parks API",
                    "_links" : {
                        "parks": make_url(req, "/parks")
                    }
                }
            ]
        },
    }
    resp = {...resp, ...make_footer(resp._embedded.items.length)}
    res.status(200).json(resp)
})


//*******************************************************
// PARKS /parks/....
//*******************************************************
function make_park_item(req, park, include_self) {
    let resp = null
    if (include_self == undefined) include_self = true
    if (allowed_park(park)) {
        resp = {
            "parkid": park,
            "disney_parkid": Parks[park].GetParkID,
            "name": Parks[park].Name,
            "timezone": Parks[park].Timezone,
            "latitude": Parks[park].LatitudeRaw,
            "longitude": Parks[park].LongitudeRaw,
            "fastpass": Parks[park].FastPass,
            "_links": {
                "googlemaps": Parks[park].toGoogleMaps(),
                "operating_hours":   make_url(req, "/parks/" + park + "/operating_hours"),
                "rides": {
                    "all":           make_url(req, "/parks/" + park + "/rides"),
                    "operating":     make_url(req, "/parks/" + park + "/rides?status=Operating"),
                    "closed":        make_url(req, "/parks/" + park + "/rides?status=Closed"),
                    "refurbishment": make_url(req, "/parks/" + park + "/rides?status=Refurbishment"),
                    "down":          make_url(req, "/parks/" + park + "/rides?status=Down")
                }
            }
        }
        if (include_self) {
            resp._links.this = make_url(req, "/parks/" + park)
        }
    }
    return resp
}

function make_park_opening_item(req, park, date) {
    let resp = null
    if (allowed_park(park) && OpeningTimes[park][date]) {
        resp = {
            "parkid": park,
            "disney_parkid": Parks[park].GetParkID,
            "name": Parks[park].Name + ' - ' + date,
            "timezone": Parks[park].Timezone,
            "date": date,
            "openingtime": OpeningTimes[park][date].openingTime,
            "closingtime": OpeningTimes[park][date].closingTime,
            "status": OpeningTimes[park][date].type,
        }

        if (OpeningTimes[park][date].special) {
            resp.special = {}
            for (var i = 0; i < OpeningTimes[park][date].special.length; i++) {
                var special = OpeningTimes[date].special[i];
                resp.special[OpeningTimes[park][date].special.type].openingtime = special.openingTime
                resp.special[OpeningTimes[park][date].special.type].closingtime = special.closingTime
            }
        }
        resp._links = {
            "park":           make_url(req, "/parks/" + park),
            "rides": {
                 "all":           make_url(req, "/parks/" + park + "/rides"),
                 "operating":     make_url(req, "/parks/" + park + "/rides?status=Operating"),
                 "closed":        make_url(req, "/parks/" + park + "/rides?status=Closed"),
                 "refurbishment": make_url(req, "/parks/" + park + "/rides?status=Refurbishment"),
                 "down":          make_url(req, "/parks/" + park + "/rides?status=Down")
             }
        }
    }
    return resp
}

app.get('/api/parks', (req, res) => {
    let itemlist = []
    let resp = null
    for (var i = 0; i < AllowedParks.length; i++) {
        var park = AllowedParks[i];
        resp = make_park_item(req, park, true)
        if (resp != null) itemlist.push(resp)
    }
    resp = {
        "_links" : make_response_header(req, "/parks", "/"),
        "_embedded": {
            "items": itemlist
        }
    }
    resp = {...resp, ...make_footer(itemlist.length)}
    res.status(200).json(resp)
})

app.get('/api/parks/:parkid', (req, res) => {
    let park = req.params.parkid
    let itemlist = []
    let resp = make_park_item(req, park, false)
    if (resp != null) itemlist.push(resp)
    resp = {
        "_links" : make_response_header(req, "/parks/" + park, "/parks"),
        "_embedded": {
            "items": itemlist
        }
    }
    resp = {...resp, ...make_footer(itemlist.length)}
    res.status(200).json(resp)
})

app.get('/api/parks/:parkid/operating_hours', (req, res) => {
    let park = req.params.parkid
    let itemlist = []
    let resp = null

    if (allowed_park(park)) {
        for (const date in OpeningTimes[park]) {
            resp = make_park_opening_item(req, park, date)
            if (resp != null) {
                resp._links.this = make_url(req, "/parks/" + park + "/operating_hours/" + date)
                itemlist.push(resp)
             }
        }
    }
    resp = {
        "_links" : make_response_header(req, "/parks/" + park + "/operating_hours",
                                             "/parks/" + park),
        "_embedded": {
            "items": itemlist
        }
    }
    resp = {...resp, ...make_footer(itemlist.length)}
    res.status(200).json(resp)
})

app.get('/api/parks/:parkid/operating_hours/:date', (req, res) => {
    let park = req.params.parkid
    let date = req.params.date
    let itemlist = []
    let resp = null

    if (allowed_park(park)) {
        resp = make_park_opening_item(req, park, date)
        if (resp != null) itemlist.push(resp)
    }
    resp = {
        "_links" : make_response_header(req, "/parks/" + park + "/operating_hours/" + date,
                                             "/parks/" + park + "/operating_hours"),
        "_embedded": {
            "items": itemlist
        }
    }
    resp = {...resp, ...make_footer(itemlist.length)}
    res.status(200).json(resp)
})


//*******************************************************
// RIDES /parks/.../rides/.....
//*******************************************************
function make_ride_item(req, park, ride, ride_status) {
    let resp = null
    if (allowed_park(park)) {
        if (Rides[ride] && ride_status !== null && Rides[ride].status && Rides[ride].status.toLowerCase() !== ride_status.toLowerCase()) {
            return resp
        }
        resp = Rides[ride]
        if (resp) {
            if (resp.meta) {
                if (resp.meta.latitude || resp.meta.longitude) {
                    resp.longitude = resp.meta.longitude
                    resp.latitude = resp.meta.latitude
                }
                if (resp.meta.type) {
                    resp.type = resp.meta.type
                }
                delete resp.meta
            }
            resp._links = {
                "park": make_url(req, "/parks/" + park),
                "operating_hours":   make_url(req, "/parks/" + park + "/operating_hours"),
                "rides": {
                    "all":           make_url(req, "/parks/" + park + "/rides"),
                    "operating":     make_url(req, "/parks/" + park + "/rides?status=Operating"),
                    "closed":        make_url(req, "/parks/" + park + "/rides?status=Closed"),
                    "refurbishment": make_url(req, "/parks/" + park + "/rides?status=Refurbishment"),
                    "down":          make_url(req, "/parks/" + park + "/rides?status=Down")
                }
            }
            if (resp.latitude || resp.longitude) {
                resp._links.googlemaps = "http://maps.google.com/?ll=" + resp.latitude + "," + resp.longitude
            }
        }
    }
    return resp
}

app.get('/api/parks/:parkid/rides', (req, res) => {
    let park = req.params.parkid
    let ride_status = req.query.status
    if (ride_status == undefined) ride_status=null
    let itemlist = []
    let resp = null
    if (allowed_park(park)) {
        rides = get_symbol_item(Parks[park], 'Rides')
        for (ride in rides) {
            resp = make_ride_item(req, park, ride, ride_status)
            if (resp != null) {
                resp._links.this = make_url(req, "/parks/" + park + "/rides/" + ride)
                itemlist.push(resp)
            }
        }
    }
    resp = {
        "_links" : make_response_header(req, "/parks/" + park + "/rides" + ((ride_status !== null) ? "?status=" + ride_status : ""),
                                             "/parks/" + park),
        "_embedded": {
            "items": itemlist
        }
    }
    resp = {...resp, ...make_footer(itemlist.length)}
    res.status(200).json(resp)
})

app.get('/api/parks/:parkid/rides/:rideid', (req, res) => {
    let park = req.params.parkid
    let ride = req.params.rideid

    let ride_status = req.query.status
    if (ride_status == undefined) ride_status=null

    let itemlist = []
    let resp = null
    if (allowed_park(park)) {
        resp = make_ride_item(req, park, ride, ride_status)
        if (resp != null) itemlist.push(resp)
    }
    resp = {
        "_links" : make_response_header(req, "/parks/" + park + "/rides/" + ride + ((ride_status !== null) ? "?status=" + ride_status : ""),
                                             "/parks/" + park + "/rides"),
        "_embedded": {
            "items": itemlist
        }
    }
    resp = {...resp, ...make_footer(itemlist.length)}
    res.status(200).json(resp)
})


//*******************************************************
// APP
//*******************************************************
app.set('json spaces', 2)
app.use(bodyParser.json())
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))
app.listen(port)
console.log('Server listening on port: ' + port)
