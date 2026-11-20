package com.bustrackr.exception;

public class OsrmDistanceException extends RuntimeException{

    public OsrmDistanceException(String s){
        super(s);
    }
    public OsrmDistanceException(String message, Throwable cause) {
        super(message, cause);
    }
}
