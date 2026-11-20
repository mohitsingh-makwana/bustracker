package com.bustrackr.specification;

import com.bustrackr.entity.Stop;
import com.bustrackr.enums.StopStatus;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.jspecify.annotations.Nullable;
import org.springframework.data.jpa.domain.Specification;

import java.util.Locale;

public class StopSpecification implements Specification<Stop> {

    public static Specification<Stop> hasId(Long id){
        return (root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("id"),id);
    }
    public static Specification<Stop> hasTransportSystemId(Long transportSystemId){
        return (root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("transportSystem").get("id"),transportSystemId);
    }

    public static Specification<Stop> hasStatus(StopStatus status){
        return (root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("status"),status);
    }

    public static Specification<Stop> hasNameLike(String name){
        return (root, query, cb) ->
            cb.like(cb.lower(root.get("name")),"%"+name.toLowerCase()+"%");

    }
    public static Specification<Stop> hasAddressLike(String address){
        return (root, query, cb) ->
                cb.like(cb.lower(root.get("address")),"%"+address.toLowerCase()+"%");

    }

    public static Specification<Stop> hasName(String name){
        return (root, query, cb) ->
                cb.equal(cb.lower(root.get("name")),name.toLowerCase());

    }
    public static Specification<Stop> hasAddress(String address){
        return (root, query, cb) ->
                cb.like(cb.lower(root.get("address")),address.toLowerCase());

    }
    public static Specification<Stop> hasStopCode(String stopCode){
        return (root, query, cb) ->
                cb.like(cb.lower(root.get("stopCode")),stopCode);

    }

    public static Specification<Stop> isActive(boolean b) {
        return (root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("active"),b);
    }

    @Override
    public @Nullable Predicate toPredicate(Root<Stop> root, CriteriaQuery<?> query, CriteriaBuilder criteriaBuilder) {
        return null;
    }
}
