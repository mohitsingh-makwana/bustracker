package com.bustrackr.specification;

import com.bustrackr.entity.TransportMember;
import com.bustrackr.enums.TransportMemberRole;
import com.bustrackr.enums.TransportMemberStatus;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.jspecify.annotations.Nullable;
import org.springframework.data.jpa.domain.Specification;

public class TransportMemberSpecification implements Specification<TransportMember> {

    public static Specification<TransportMember> hasId(Long id){
        return (root, query, criteriaBuilder) ->
                criteriaBuilder.equal(root.get("id"),id);
    }
    public static Specification<TransportMember> hasTransportSystemId(Long id){
        return (root, query, criteriaBuilder) ->
                criteriaBuilder.equal(root.get("transportSystem").get("id"),id);
    }

    public static Specification<TransportMember> hasUserId(Long id){
        return (root, query, criteriaBuilder) ->
                criteriaBuilder.equal(root.get("user").get("id"),id);
    }
    public static Specification<TransportMember> hasRole(TransportMemberRole role){
        return (root, query, criteriaBuilder) ->
                criteriaBuilder.equal(root.get("role"),role);
    }

    public static Specification<TransportMember> hasStatus(TransportMemberStatus status){
        return (root, query, criteriaBuilder) ->
                criteriaBuilder.equal(root.get("status"),status);
    }

    public static Specification<TransportMember> isActive(Boolean b){
        return (root, query, criteriaBuilder) ->
                criteriaBuilder.equal(root.get("active"),b);
    }


    @Override
    public @Nullable Predicate toPredicate(Root<TransportMember> root, CriteriaQuery<?> query, CriteriaBuilder criteriaBuilder) {
        return null;
    }
}
