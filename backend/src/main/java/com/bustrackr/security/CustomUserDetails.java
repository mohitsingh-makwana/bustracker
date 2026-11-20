package com.bustrackr.security;

import com.bustrackr.entity.User;
import com.bustrackr.enums.TransportMemberRole;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

@Getter
public class CustomUserDetails implements UserDetails {

    private final Long userId;
    private final Long transportMemberId;
    private final Long transportSystemId;
    private final String transportSystemName;
    private final User user;
    private final TransportMemberRole role;

    public CustomUserDetails(User user,Long transportMemberId,Long transportSystemId,String transportSystemName,TransportMemberRole role){
        this.user=user;
        this.userId=user.getId();
        this.transportMemberId=transportMemberId;
        this.transportSystemId=transportSystemId;
        this.transportSystemName=transportSystemName;
        this.role=role;
    }


    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return role == null
                ? List.of()
                : List.of(new SimpleGrantedAuthority(role.name()));
    }

    @Override
    public  String getPassword() {
        return user.getPasswordHash();
    }

    @Override
    public String getUsername() {
        return user.getEmail();
    }

}
