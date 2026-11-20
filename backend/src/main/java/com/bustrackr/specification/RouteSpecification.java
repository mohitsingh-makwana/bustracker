package com.bustrackr.specification;

import com.bustrackr.entity.Route;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.jspecify.annotations.Nullable;
import org.springframework.data.jpa.domain.Specification;

public class RouteSpecification implements Specification<Route> {

    public static  Specification<Route> hasTransportSystemId(Long id){
        return (root, query, cb) ->cb.equal(root.get("transportSystem").get("id"),id );
    }

    public static  Specification<Route> hasId(Long id){
        return (root, query, cb) ->cb.equal(root.get("id"),id );
    }

    public static  Specification<Route> isActive(boolean b){
        return (root, query, cb) ->cb.equal(root.get("active"),b);
    }

    public static  Specification<Route> hasRouteCode(String  routeCode){
        return (root, query, cb) ->cb.equal(root.get("routeCode"),routeCode );
    }

    public static  Specification<Route> hasName(String name){
        return (root, query, cb) ->cb.equal(root.get("name"),name);
    }

    public static  Specification<Route> hasDestinationStop(Long id){
        return (root, query, cb) ->cb.equal(root.get("destinationStop").get("id"),id );
    }

    public static  Specification<Route> hasOriginStop(Long id){
        return (root, query, cb) ->cb.equal(root.get("originStop").get("id"),id);
    }



    @Override
    public @Nullable Predicate toPredicate(Root<Route> root, CriteriaQuery<?> query, CriteriaBuilder criteriaBuilder) {
        return null;
    }
}
