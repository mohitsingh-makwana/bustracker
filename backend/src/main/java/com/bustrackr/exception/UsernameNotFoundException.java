package com.bustrackr.exception;

public class UsernameNotFoundException extends RuntimeException{

    public UsernameNotFoundException(String s){
        super(s);
    }
}
