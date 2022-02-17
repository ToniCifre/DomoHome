import axios from "axios";
import authHeader from "./auth-header";

const API_URL = process.env.REACT_APP_API_ENDPOINT+"/api/v1/";


//===== SENSOR =====
export const getSensorsValuesGroupBy = (group) => {
    return  axios.get(API_URL+'user/sensors/values/'+group, {headers: authHeader()})
};
export const getSensorsShowGroupBy = (group) => {
    return  axios.get(API_URL+'user/sensors/show/'+group, {headers: authHeader()})
};
export const getSensorsByType = () => {
    return  axios.get(API_URL+'sensors/type', {headers: authHeader()})
};
export const getUserSensorsGroupBy = (user,group) => {
    return  axios.get(API_URL+'user/'+user+'/sensors/'+group, {headers: authHeader()})
};
export const updateSensor = (type, sensor, data) => {
    return axios.put(API_URL + "update/"+type+'/'+sensor, data, {headers: authHeader()})
};
export const updateUserSensor = (user,sensor,inUser) => {
    return  axios.put(API_URL+'user/'+user+'/sensor/'+sensor+'/'+inUser, {}, {headers: authHeader()})
};
export const updateSensorsShow = (sensor, show) => {
    return  axios.put(API_URL+'sensor/'+sensor+'/show/'+show,{},{headers: authHeader()})
};
export const deleteSensor = (sensor) => {
    return axios.delete(API_URL + "delete_sensor/"+sensor, {headers: authHeader()})
};

//===== ROOM =====
export const getRooms= () => {
    return  axios.get(API_URL+'rooms', {headers: authHeader()})
};
export const addRoom = (room) => {
    return axios.post(API_URL + "rooms", {room:room}, {headers: authHeader()})
};
export const updateRoom = (editRoom, room) => {
    return axios.put(API_URL + "rooms/"+editRoom, {newRoom:room}, {headers: authHeader()})
};
export const deleteRoom = (room) => {
    return axios.delete(API_URL + "rooms/"+room, {headers: authHeader()})
};

//===== DEFINITION =====
export const getAllDefinitions= () => {
    return  axios.get(API_URL+'definitions', {headers: authHeader()})
};
export const getDefinitions= (type) => {
    return  axios.get(API_URL+type+'/definitions', {headers: authHeader()})
};
export const addDefinition = (type, definitionId) => {
    return axios.post(API_URL + type+ "/definitions", definitionId, {headers: authHeader()})
};
export const updateDefinition = (type, definitionId, definition) => {
    return axios.put(API_URL + type+ "/definitions/"+definitionId, definition, {headers: authHeader()})
};
export const deleteDefinition = (type, definitionId) => {
    return axios.delete(API_URL + type+ "/definitions/"+definitionId, {headers: authHeader()})
};

//===== USER =====
export const getUsersNames = () => {
    return  axios.get(API_URL+'users/name', {headers: authHeader()})
};
export const getUsers = () => {
    return  axios.get(API_URL+'users', {headers: authHeader()})
};
export const addUser = (user) => {
    return axios.post(API_URL + "users", user, {headers: authHeader()})
};
export const updateUser = (userId, newUser) => {
    return axios.put(API_URL + "users/"+userId, newUser, {headers: authHeader()})
};
export const updateUserPass = (userId, newPass) => {
    return axios.put(API_URL + "users/"+userId+"/password", {psw:newPass}, {headers: authHeader()})
};
export const deleteUser = (userId) => {
    return axios.delete(API_URL + "users/"+userId, {headers: authHeader()})
};

// ===== SPECIALIZATIONS =====
export const getActuatorsInfo = () => {
    return  axios.get(API_URL+'actuators', {headers: authHeader()})
};
export const getPassiveInfo = () => {
    return  axios.get(API_URL+'passives', {headers: authHeader()})
};
export const getActivesInfo = () => {
    return  axios.get(API_URL+'actives', {headers: authHeader()})
};
export const getCamerasInfo = () => {
    return  axios.get(API_URL+'cameras', {headers: authHeader()})
};

// ===== DEVICE =====
export const addDevice = (data) => {
    return axios.post(API_URL + "device", data, {headers: authHeader()})
};

// ===== SCHEDULER =====
export const addScheduler = (sensor_id,every,interval,at,value) => {
    return axios.post(API_URL + "scheduler",
        {sensor:sensor_id,every:every,interval:interval,at:at,value:value},{headers: authHeader()})
};
export const deleteScheduler = (Scheduler) => {
    return axios.delete(API_URL + "schedulers/"+Scheduler,{headers: authHeader()})
};
export const getSchedulers = () => {
    return axios.get(API_URL + "schedulers",{headers: authHeader()})
};

// ===== TRIGGER =====
export const addTrigger = (data) => {
    return axios.post(API_URL + "trigger", data, {headers: authHeader()})
};
export const deleteTrigger = (trigger) => {
    return  axios.delete(API_URL+'triggers/'+trigger, {headers: authHeader()})
};
export const getTrigger = () => {
    return  axios.get(API_URL+'triggers', {headers: authHeader()})
};


export const serialize =(form) => {
    let field, s = [];
    if (typeof form == 'object' && form.nodeName === "FORM") {
        let len = form.elements.length;
        for (let i=0; i<len; i++) {
            field = form.elements[i];
            if (field.name && !field.disabled && field.type !== 'file' && field.type !== 'reset' && field.type !== 'submit' && field.type !== 'button') {
                if (field.type === 'select-multiple') {
                    for (let j=form.elements[i].options.length-1; j>=0; j--) {
                        if(field.options[j].selected)
                            s[s.length] = encodeURIComponent(field.name) + "=" + encodeURIComponent(field.options[j].value);
                    }
                } else if ((field.type !== 'checkbox' && field.type !== 'radio') || field.checked) {
                    s[s.length] = encodeURIComponent(field.name) + "=" + encodeURIComponent(field.value);
                }
            }
        }
    }
    return s.join('&').replace(/%20/g, '+');
}
