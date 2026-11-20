package com.bustrackr.exception;

public class ResourceNotFoundException extends RuntimeException{

  public ResourceNotFoundException(String s){
        super(s);
    }
}
