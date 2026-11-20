package com.bustrackr.specification;


import com.bustrackr.entity.TransportSystem;
import com.bustrackr.enums.AccessType;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.jspecify.annotations.Nullable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

public class TransportSystemSpecification implements Specification<TransportSystem>{

    public static Specification<TransportSystem> hasNameLike(String name){
        return (root, query, cb) ->
                cb.like(cb.lower(root.get("name")),"%"+name.toLowerCase()+"%");
    }
    public static Specification<TransportSystem> hasName(String name){
        return (root, query, cb) ->
                cb.like(cb.lower(root.get("name")),name.toLowerCase());
    }
    public static Specification<TransportSystem> hasId(Long id){
        return (root, query, cb) ->
                cb.equal(root.get("id"),id);
    }

    public static Specification<TransportSystem> hasTransportCode(String transportCode){
        return (root, query, cb) ->
                cb.like(root.get("transportCode"),transportCode);
    }
    public static Specification<TransportSystem> hasAddress(String address){
        return ((root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("city"),address));
    }


    public static Specification<TransportSystem> hasAccessType(AccessType accessType){
        return (root, query, criteriaBuilder) ->
            criteriaBuilder.equal(root.get("accessType"), accessType);

    }
    public static Specification<TransportSystem> hasIds(List<Long> ids){
        return (root, query, cb) -> {
            if (ids == null || ids.isEmpty()) {
                return cb.disjunction();
            }

            return root.get("id").in(ids);
        };

    }

    public static Specification<TransportSystem> hasActive(boolean b) {
        return (root, query, criteriaBuilder) ->
                criteriaBuilder.equal(root.get("active"),b);
    }

    @Override
    public @Nullable Predicate toPredicate(Root<TransportSystem> root, CriteriaQuery<?> query, CriteriaBuilder criteriaBuilder) {
        return null;
    }
}
