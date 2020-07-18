var def = JSON.parse(JSON.stringify(require('./definitions.json')));
const log = require('electron-log');
import {wtconfig, wtutils} from '../../../wtutils'

const fetch = require('node-fetch');
const jp = require('jsonpath')

const et = new class ET {
    constructor() {                    
    }

    async getItemData(baseURL, accessToken, element)
    {        
        const url = baseURL + element + '?checkFiles=1&includeExtras=1&includeBandwidths=1';
        var headers = {
            "Accept": "application/json",
            "X-Plex-Token": accessToken
        }        
        log.verbose(`Calling url: ${url}`)
        let response = await fetch(url, { method: 'GET', headers: headers});    
        let resp = await response.json();
        const respJSON = await Promise.resolve(resp)                
        log.debug(`Done key: ${element}`)
        return respJSON            
    }

    getRealLevelName(level, libType) {
        // First get the real name of the level, and not just the display name
        const levelName = def[libType]['levels'][level]
        log.debug(`ET LevelName: ${levelName}`)
        return levelName
    } 

    getLevelFields(level, libType) {
        // return fields in a level
        const out = []                
        const levels = def[libType]['level'][et.getRealLevelName(level, libType)]        
        Object.keys(levels).forEach(function(key) {            
            out.push(levels[key])
          });        
        return out
    }

    async getLevelCall (libType, level) {
        // this will return number of calls needed
        const count = await def[libType]['LevelCount'][level]
        log.debug('Count needed is: ' + count)                  
        return count
    }

    getLevels(libType) {
        // Returns an array of levels for a selected type og medias, like 'movie'
        const levels = def[libType]['levels']
        log.debug('ET LevelNames: ' + JSON.stringify(levels))
        return levels
    }

    getLevelKeys(libType){
        // Only return the keys for possible levels
        const out = []
        const levels = def[libType]['levels']
        Object.keys(levels).forEach(function(key) {            
            out.push(key)
          });        
        return out        
    }

    getFieldKey(libType, fieldName) {
        return def[libType]['fields'][fieldName]['key']        
    }

    getField(libType, fieldName) {
        return def[libType]['fields'][fieldName]        
    }

    getFieldType(libType, fieldName) {
        return def[libType]['fields'][fieldName]['type']        
    }

    getFieldCall(libType, fieldName) {
        return def[libType]['fields'][fieldName]['call']        
    }

    getFieldSubtype(libType, fieldName) {
        return def[libType]['fields'][fieldName]['subtype']        
    }


    getFieldsKeyVal( libType, level) {
        // Get fields for level
        const fields = et.getLevelFields(level, libType)
        const out = [] 
        fields.forEach(element => {                     
            const item = {}
            item[element] = et.getFieldKey(libType, element)
            out.push(item)
        });
        return out
    }

    getFieldsKeyValType( libType, level) {
        // Get field and type for level
        const fields = et.getLevelFields(level, libType)        
        const out = [] 
        fields.forEach(element => {            
            const item = {}
            const vals = []                        
            vals.push(et.getFieldKey(libType, element))
            vals.push(et.getFieldType(libType, element))                                 
            item[element] = vals
            out.push(item)
        });        
        return out
    }

    getFields( libType, level) {
        // Get field and type for level
        const fields = et.getLevelFields(level, libType)        
        const out = [] 
        fields.forEach(element => {            
            const item = {}                        
            item[element] = et.getField(libType, element)
            out.push(item)
        });        
        return out
    }

    async getSectionNameSize(baseURI, accessToken, sectionID) {
        //getSectionNameAndSize(baseURI, accessToken, sectionID)
        const url = baseURI + '/library/sections/' + sectionID + '/all?X-Plex-Container-Start=0&X-Plex-Container-Size=0'    
        var headers = {
            "Accept": "application/json",
            "X-Plex-Token": accessToken
        }
        const result = {}
        let response = await fetch(url, { method: 'GET', headers: headers});    
        let resp = await response.json();
        const respJSON = await Promise.resolve(resp)    
        result['size'] = jp.value(respJSON, '$.MediaContainer.totalSize');
        result['name'] = jp.value(respJSON, '$.MediaContainer.librarySectionTitle');        
        return result  
    }
}

const excel2 = new class Excel {
    constructor() {           
    }

    AddRow(Sheet, Row) {
        // Adds a row to the Sheet        
        Sheet.addRow(Row);
    }

    async NewExcelWorkBook() {
        const Excel = require('exceljs');                
        // A new Excel Work Book
        const workbook = new Excel.Workbook();
        // Some information about the Excel Work Book.
        workbook.creator = 'WebTools-NG';
        workbook.lastModifiedBy = '';
        workbook.created = new Date();
        workbook.modified = new Date();
        return workbook
    }

    async NewSheet(Workbook, Library, Level) {        
        const sheet = Workbook.addWorksheet(Library + '-' + Level, {
            views: [
            {state: 'frozen', ySplit: 1}
            ]
            });        
        return sheet
    }

    async AddHeader(Sheet, Level, libType) {
        const columns = []
        log.verbose(`AddHeader sheet: ${Sheet} - level: ${Level} - libType: ${libType}`)        
        // Get level fields
        const fields = et.getLevelFields(Level, libType)              
        for (var i=0; i<fields.length; i++) {                        
            log.verbose('Column: ' + fields[i] + ' - ' + fields[i])                                                
            //let column = { header: Level[i], key: 'id', width: 10 }
            let column = { header: fields[i], key: fields[i] }
            columns.push(column)            
        }             
        Sheet.columns = columns
        // Add background to header column
        Sheet.getRow(1).fill = {
            type: 'pattern',
            pattern:'solid',
            fgColor:{ argb:'729fcf' }
            }

/*         Sheet.autoFilter = {
            from: 'A1',
            to: 'D1',
          } */
        return true;
    }

    async SaveWorkbook(Workbook, Library, Level, Type) {
        const fs = require('fs')
        const dateFormat = require('dateformat');
        const OutDir = wtconfig.get('ET.OutPath', wtutils.UserHomeDir)
        const timeStamp=dateFormat(new Date(), "yyyy.mm.dd_h.MM.ss");          
        const name = OutDir + '/' + Library + '_' + Level + '_' + timeStamp + '.' + Type;
        log.debug('Saving output file as: ' + name)
        // Save Excel on Hard Disk
        Workbook.xlsx.writeBuffer()
            .then(buffer => fs.writeFileSync(name, buffer))
        return true
    }

    async addRowToSheet(sheet, libType, level, data) {        
        log.debug(`Start addRowToSheet. libType: ${libType} - level: ${level}`)          
        // Placeholder for row        
        let row = []
        let date, year, month, day, hours, minutes, seconds
        //year, month, day,
        // Need to find the fields and keys we'll
        // query the data for
        const keyVal = et.getFieldsKeyValType( libType, level)               
        // Now get the medias                
        //const nodes = jp.nodes(data, '$.MediaContainer.Metadata[*]')         


        const fields = et.getFields( libType, level) 

        const rowentry = {}        
        let lookup, val, array, i, valArray, valArrayVal, subType, subKey                  
        
        for (var x=0; x<fields.length; x++) {                                   
            var name = Object.keys(fields[x]);
            lookup = jp.value(fields[x], '$..key')            
            switch(jp.value(fields[x], '$..type')) {
                case "string":                                        
                    val = jp.value(data, lookup);                    
                    // Make N/A if not found
                    if (val == null)
                    {
                        val = wtconfig.get('ET.NotAvail', 'N/A')
                    }
                    break;
                case "array":                                        
                    array = jp.query(data, lookup);
                    valArray = []
                    
                    for (i=0; i<array.length; i++) {                        
                        subType = jp.value(fields[x], '$..subtype')
                        subKey = jp.value(fields[x], '$..subkey')
                        //console.log('Ged 1112233 SubType: ' + subType)
                        switch(subType) {
                            case "string":
                                //valArrayVal = jp.value(fields[x], subKey)
                                valArrayVal = jp.value(array[i], subKey)
                                // Make N/A if not found
                                if (valArrayVal == null)
                                {
                                    valArrayVal = wtconfig.get('ET.NotAvail', 'N/A')
                                }
                                break
                        }                                            
                        valArray.push(valArrayVal)


                    }                    
                    val = valArray.join(wtconfig.get('ET.ArraySep', ' - '))                                        
                    break;
                case "int":                                        
                    console.log('************ FIX INT **************')
                    break;
                case "time":
                    console.log('************ FIX TIME **************')
                    val = jp.value(data, Object.values(keyVal[i])[0][0]);                                                
                    if ( typeof val !== 'undefined' && val )
                    {
                        seconds = '0' + (Math.round(val/1000)%60).toString();                            
                        minutes = '0' + (Math.round((val/(1000 * 60))) % 60).toString();                            
                        hours = (Math.trunc(val / (1000 * 60 * 60)) % 24).toString();                                                                  
                        // Will display time in 10:30:23 format                        
                        val = hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);                                           
                    }
                    else
                    {
                        val = null
                    }                                            
                    break;
                case "datetime":
                    val = jp.value(data, Object.values(keyVal[i])[0][0]);                                                
                    if ( typeof val !== 'undefined' && val )
                    {
                        // Create a new JavaScript Date object based on the timestamp
                        // multiplied by 1000 so that the argument is in milliseconds, not seconds.
                        date = new Date(val * 1000);                            
                        year = date.getFullYear().toString();                             
                        month = ('0' + date.getMonth().toString()).substr(-2);  
                        day = ('0' +  date.getDate().toString()).substr(-2);                            
                        hours = date.getHours();                            
                        minutes = "0" + date.getMinutes();                            
                        seconds = "0" + date.getSeconds();
                        // Will display time in 10:30:23 format                                                      
                        val = year+'-'+month+'-'+day+' '+hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);                           
                    }
                    else
                    {
                        val = null
                    }                                            
                    break;  
            }
            rowentry[name[0]] = val
        }
        row.push(rowentry)        
        row.forEach(element => {
            excel2.AddRow(sheet, element)                        
        });
    }
    


    /*     console.log('Ged Cava1: ' + JSON.stringify(keyVal))
                        
            for (var i=0; i<keyVal.length; i++) {               
                // Get type
                 
                console.log('Ged Field Type: ' + Object.values(keyVal[i])[0][1]);              
                switch(Object.values(keyVal[i])[0][1]) {
                    case "string":
                        console.log('Ged Item: ' + JSON.stringify(data))
                        val = jp.value(data, Object.values(keyVal[i])[0][0]);
                        console.log('Ged1 Result: ' + val)
                        break;
                    case "array":
                        // Get Items 
                        console.log('Ged123 Item: ' + JSON.stringify(data)) 
                        console.log('Ged123 keyVal: ' +  JSON.stringify(keyVal[i]))                     
                        val = jp.query(data, Object.values(keyVal[i])[0][0]);
                        console.log('Ged123 VAL: ' + JSON.stringify(val))
                        // Seperate as wanted
                        val = val.join(wtconfig.get('ET.ArraySep', ' - '))                        
                        break;
                    case "int":
                        val = '';
                        break;
                    case "time":
                        val = jp.value(data, Object.values(keyVal[i])[0][0]);                                                
                        if ( typeof val !== 'undefined' && val )
                        {
                            seconds = '0' + (Math.round(val/1000)%60).toString();                            
                            minutes = '0' + (Math.round((val/(1000 * 60))) % 60).toString();                            
                            hours = (Math.trunc(val / (1000 * 60 * 60)) % 24).toString();                                                                  
                            // Will display time in 10:30:23 format                        
                            val = hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);                                           
                        }
                        else
                        {
                            val = null
                        }                                            
                        break;  

                    case "datetime":
                        val = jp.value(data, Object.values(keyVal[i])[0][0]);                                                
                        if ( typeof val !== 'undefined' && val )
                        {
                            // Create a new JavaScript Date object based on the timestamp
                            // multiplied by 1000 so that the argument is in milliseconds, not seconds.
                            date = new Date(val * 1000);                            
                            year = date.getFullYear().toString();                             
                            month = ('0' + date.getMonth().toString()).substr(-2);  
                            day = ('0' +  date.getDate().toString()).substr(-2);                            
                            hours = date.getHours();                            
                            minutes = "0" + date.getMinutes();                            
                            seconds = "0" + date.getSeconds();
                            // Will display time in 10:30:23 format                                                      
                            val = year+'-'+month+'-'+day+' '+hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);                           
                        }
                        else
                        {
                            val = null
                        }                                            
                        break;            
                }           
                if (val == null)
                {
                    val = wtconfig.get('ET.NotAvail', 'N/A')
                }
                rowentry[Object.keys(keyVal[i])] = val
            }
            row.push(rowentry)
        
        //console.log('Entire rows: ' + JSON.stringify(row))
        row.forEach(element => {
            excel2.AddRow(sheet, element)                        
        });                     
    }   */
    
    async createOutFile( libName, level, libType, outType, data, baseURL, accessToken )
    {       
        // First create a WorkBook
        const workBook = await excel2.NewExcelWorkBook()     
        // Create Sheet
        let sheet = await excel2.NewSheet(workBook, libName, level)        
        // Add the header to the sheet
        const header = await excel2.AddHeader(sheet, level, libType)
        log.debug(`header: ${header}`);
        // Now we need to find out how many calls to make
        const call = await et.getLevelCall(libType, level)                 
        if ( call == 1 )
        {            
            // Single call needed, so simply pass along the individual items            
            const items = jp.nodes(data, '$.MediaContainer.Metadata[*]')         
            for (var x=0; x<items.length; x++) {             
                await excel2.addRowToSheet(sheet, libType, level, items[x]['value'])
            }            
        }
        else
        {            
            // Get rating key for each item            
            const urls = jp.query(data, '$.MediaContainer.Metadata[*].key');
            log.verbose('Items to lookup are: ' + urls)

            for (const url of urls) {
                const contents = await et.getItemData(baseURL, accessToken, url);               
                const items = jp.nodes(contents, '$.MediaContainer.Metadata[*]')         
                for (var y=0; y<items.length; y++) {               
                    excel2.addRowToSheet(sheet, libType, level, items[y]['value'])
                }
              }                             
        }         
        // Save Excel file
        const result = await excel2.SaveWorkbook(workBook, libName, level, 'xlsx')
        return result
    }
}

export {et, excel2};