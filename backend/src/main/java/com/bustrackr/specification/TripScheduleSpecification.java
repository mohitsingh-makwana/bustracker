package com.bustrackr.specification;

import com.bustrackr.entity.TripSchedule;
import com.bustrackr.enums.TripScheduleStatus;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.jspecify.annotations.Nullable;
import org.springframework.data.jpa.domain.Specification;

import java.time.DayOfWeek;
import java.time.LocalTime;

public class TripScheduleSpecification implements Specification<TripSchedule> {


    public static Specification<TripSchedule> hasTransportSystemId(Long transportSystemId){
        return (root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("transportSystem").get("id"),transportSystemId);
    }

    public static Specification<TripSchedule> hasId(Long id) {
        return (root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("id"),id);
    }

    public static Specification<TripSchedule> hasStatus(TripScheduleStatus tripScheduleStatus) {
        return (root, query, cb) -> cb.equal(root.get("scheduleStatus"),tripScheduleStatus);
    }

    public static Specification<TripSchedule> hasRoutePatternId(
            Long routePatternId) {
        return (root, query, cb) ->
                routePatternId == null
                        ? cb.conjunction()
                        : cb.equal(
                        root.get("routePattern").get("id"),
                        routePatternId
                );
    }

    public static Specification<TripSchedule> hasDriverId(
            Long driverId) {
        return (root, query, cb) ->
                driverId == null
                        ? cb.conjunction()
                        : cb.equal(
                        root.get("driver").get("id"),
                        driverId
                );
    }
    public static Specification<TripSchedule> hasBusId(
            Long busId) {
        return (root, query, cb) ->
                busId == null
                        ? cb.conjunction()
                        : cb.equal(
                        root.get("bus").get("id"),
                        busId
                );
    }

    public static Specification<TripSchedule> operatesOnDay(
            DayOfWeek day) {
        return (root, query, cb) ->
                day == null
                        ? cb.conjunction()
                        : cb.isMember(
                        day,
                        root.get("operatingDays")
                );
    }

    public static Specification<TripSchedule> startsBefore(
            LocalTime endTime) {
        return (root, query, cb) ->
                endTime == null
                        ? cb.conjunction()
                        : cb.lessThan(
                        root.get("startTime"),
                        endTime
                );
    }

    public static Specification<TripSchedule> endsAfter(
            LocalTime startTime) {
        return (root, query, cb) ->
                startTime == null
                        ? cb.conjunction()
                        : cb.greaterThan(
                        root.get("endTime"),
                        startTime
                );
    }

    @Override
    public @Nullable Predicate toPredicate(Root<TripSchedule> root, CriteriaQuery<?> query, CriteriaBuilder criteriaBuilder) {
        return null;
    }
}
