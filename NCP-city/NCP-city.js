/* Magic Mirror
 * Module: NCP-city

* @property {number} appid - API access key for https://tianqiapi.com/user to register.
* @property {string} appsecret - API access key for https://tianqiapi.com/user to register.
* @property {string} version - Fixed value for https://tianqiapi.com/user(Each interface has a different version value).
*/
/* global Module */



Module.register("NCP-city",{

    defaults: {
        appid: "",
        appsecret:"",
        units: config.units,
        maxNumberOfLists: 10,
        updateInterval: 60 * 60 * 1000, // every 60 minutes
        timeFormat: config.timeFormat,
        lang: config.language,
        colored: false,
        scale: false,
        header:"",
        animationSpeed: 1000,
        initialLoadDelay: 2500, // 2.5 seconds delay. This delay is used to keep the API happy.
        retryDelay: 2500,
        version: "epidemic",//Fixed value
        apiBase: "https://tianqiapi.com/api",

        appendLocationNameToHeader: true,
        tableClass: "small"
    },

    // create a variable to hold the location name based on the API result.
    fetchedLocationName: "",

    // Define required scripts.
    getScripts: function() {
        return ["moment.js"];
    },

    // Define required scripts.
    getStyles: function() {
        return [ "NCP-city.css"];
    },

    // Define required translations.
    getTranslations: function() {
        // The translations for the default modules are defined in the core translation files.
        // Therefor we can just return false. Otherwise we should have returned a dictionary.
        // If you're trying to build your own module including translations, check out the documentation.
        return false;
    },

    // Define start sequence.
    start: function() {
        Log.info("Starting module: " + this.name);
        // Set locale.
        moment.locale(config.language);
        this.datalist = [];
        this.topten=[];
        this.loaded = false;
        this.scheduleUpdate(this.config.initialLoadDelay);  //需要改
        this.updateTimer = null;
    },

    // Override dom generator.
    getDom: function() {
        var wrapper = document.createElement("div");
        if (this.config.appid === "" || this.config.appsecret==="") {
            wrapper.innerHTML = "Please set the correct appid(or appsecret) in the config for this module ";
            wrapper.className = "dimmed light small";
            return wrapper;
        }
        if (!this.loaded) {
            wrapper.innerHTML = this.translate("Loading...");
            wrapper.className = "dimmed bright small";
            return wrapper;
        }

        var table = document.createElement("table");
        table.className = this.config.tableClass;
        for (var c=0;c<this.topten.length;c++) {
            var row = document.createElement("tr");
            if (this.config.colored) {
                row.className = "colored";
            }
            table.appendChild(row);

            var provinceCell = document.createElement("td");
            provinceCell.className = "font";
            provinceCell.innerHTML=this.topten[c].province;
            row.appendChild(provinceCell);

            var diagnosedCell = document.createElement("td");
            diagnosedCell.className = "font";
            diagnosedCell.innerHTML=this.topten[c].diagnosed;
            row.appendChild(diagnosedCell);

            var suspectCell = document.createElement("td");
            suspectCell.className = "font";
            suspectCell.innerHTML=this.topten[c].suspect;
            row.appendChild(suspectCell);

            var curedCell = document.createElement("td");
            curedCell.className = "font";
            curedCell.innerHTML=this.topten[c].cured;
            row.appendChild(curedCell);

            var deathCell = document.createElement("td");
            deathCell.className = "font";
            deathCell.innerHTML=this.topten[c].death;
            row.appendChild(deathCell);
        }
        return table;

    },

    // Override getHeader method.
    getHeader: function() {
        if (this.config.appendLocationNameToHeader) {
            return this.data.header + " " + this.fetchedLocationName;
        }

        return this.data.header;

    },


    /* Override notification handler.*/
    notificationReceived: function(notification, payload, sender) {
        if (notification === "DOM_OBJECTS_CREATED") {
            if (this.config.appendLocationNameToHeader) {
                this.hide(0, {lockString: this.identifier});
            }
        }
    },

    /*  NCPRequest(compliments)
     * Requests new data from api.
     * Calls processData on successful response.
     */
    NCPRequest: function() {
        if (this.config.appid === "") {
            Log.error(" appid not set!");
            return;
        }
        var self=this;
        var url = this.config.apiBase + this.getParams() ;
        //console.log(url);
        var Request = new XMLHttpRequest();
        Request.open("GET", url, true);
        Request.onreadystatechange = function() {
            if (this.readyState === 4  && this.status === 200) {
                console.log(JSON.parse(this.response));
                self.processData(JSON.parse(this.response));
            }
        };
        Request.send();
    },

    /* getParams(compliments)
     * Generates an url with api parameters based on the config.
     *
     * return String - URL params.
     */
    getParams: function() {
        var params = "?";
        console.log(this.config.version);
        if(this.config.version) {
            params += "version=" + this.config.version;
        } else if(this.config.appid) {
            params += "appid=" + this.config.appid;
        } else if (this.config.appid) {
            params += "appsecret=" + this.config.appsecret;
        }else {
            this.hide(this.config.animationSpeed, {lockString:this.identifier});
            return;
        }

        params += "&appid=" + this.config.appid;
        params += "&appsecret=" + this.config.appsecret;

        return params;
    },

    /* processData(data)
     * Uses the received data to set the various values.
     *
     * argument data object - Weather information received form openweather.org.
     */
    processData: function(data) {
        this.datalist=[];
        this.topten=[];
        var provinceList=data.data.list;
        for (var i=0;i<provinceList.length;i++) {
            var newlist=provinceList[i].toString();
            newlist=newlist.replace(/例/g,"").split(" ");
            var province=newlist[0];  //省份
            var diagnosed;//确诊
            if(newlist.indexOf("确诊")===-1){
                diagnosed=0;
            }else{
                diagnosed=newlist[newlist.indexOf("确诊")+1]
            }
            var suspect;  //疑似
            if(newlist.indexOf("，疑似")===-1){
                suspect="";
            }else{
                suspect=newlist[newlist.indexOf("，疑似")+1];
            }
            var cured;  //治愈
            if(newlist.indexOf("，治愈")===-1){
                cured=0;
            }else{
                cured=newlist[newlist.indexOf("，治愈")+1];
            }
            if(newlist.indexOf("，死亡")===-1){
                death=0;
            }else{
                death=newlist[newlist.indexOf("，死亡")+1];
            }
            var provinceData={
                province:province,
                diagnosed:diagnosed,
                suspect:suspect,
                cured:cured,
                death:death
            };
            this.datalist.push(provinceData);
        }

        var compare = function (prop) {
            return function (obj1, obj2) {
                var val1 = obj1[prop];
                var val2 = obj2[prop];
                if (!isNaN(Number(val1)) && !isNaN(Number(val2))) {
                    val1 = Number(val1);
                    val2 = Number(val2);
                }
                if (val1 > val2) {
                    return -1;
                } else if (val1 < val2) {
                    return 1;
                } else {
                    return 0;
                }
            }
        };
        this.datalist.sort(compare("diagnosed"));
        console.log(this.datalist);


        var shanghai=this.datalist.filter(function(item){
            return item.province=="上海"
        });
        console.log(shanghai);

        var hubei=this.datalist.filter(function(item){
            return item.province=="湖北"
        });
        console.log(hubei);
        for(var p=1;p<this.datalist.length-25;p++){
            this.topten.push(this.datalist[p]);
        }
        this.topten.sort();
        this.topten.unshift(hubei[0],shanghai[0]);
        var title={
            province:"省份",
            diagnosed:"确诊",
            suspect:"疑似",
            cured:"治愈",
            death:"死亡"
        };
        var total={
            province:"中国",//(国家)
            diagnosed:data.data["diagnosed"],
            suspect:data.data["suspect"],
            cured:data.data["cured"],
            death:data.data["death"]
        };
        this.topten.unshift(title,total);
        console.log(this.topten);
        this.show(this.config.animationSpeed, {lockString:this.identifier});
        this.loaded = true;
        this.updateDom(this.config.animationSpeed);
    },

    /* scheduleUpdate()
     * Schedule next update.
     *
     * argument delay number - Milliseconds before next update. If empty, this.config.updateInterval is used.
     */
    scheduleUpdate: function(delay) {
        var nextLoad = this.config.updateInterval;
        if (typeof delay !== "undefined" && delay >= 0) {
            nextLoad = delay;
        }

        var self = this;
        clearTimeout(this.updateTimer);
        this.updateTimer = setTimeout(function() {
            self.NCPRequest();
        }, nextLoad);
    }
});
