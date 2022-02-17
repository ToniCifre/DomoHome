import React from 'react';

const CameraSocketContext = React.createContext();

export const CameraSocketProvider = CameraSocketContext.Provider
export const CameraSocketConsumer = CameraSocketContext.Consumer

export default CameraSocketContext


