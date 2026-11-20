package com.bustrackr.specification;

import com.bustrackr.entity.Trip;
import com.bustrackr.entity.TripSchedule;
import com.bustrackr.enums.TripStatus;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.jspecify.annotations.Nullable;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

public class TripSpecification implements Specification<Trip> {

    public static Specification<Trip> hasId(Long id){
        return (root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("id"),id);
    }
    public static Specification<Trip> hasTransportSystemId(Long transportSystemId){
        return (root, query, criteriaBuilder) -> criteriaBuilder.equal(root.get("transportSystem").get("id"),transportSystemId);
    }
    public static Specification<Trip> hasStatus(TripStatus status){
        return (root, query, cb) ->cb.equal(root.get("status"),status);
    }
    public static Specification<Trip> hasDriverId(Long driverId){
        return (root, query, cb) -> cb.equal(root.get("driver").get("id"),driverId);
    }

    public static Specification<Trip> hasRoutePatternId(Long routePatternId){
        return (root, query, cb) -> cb.equal(root.get("routePattern").get("id"),routePatternId);
    }

    public static Specification<Trip> hasScheduledDate(LocalDate date) {
        return (root, query, cb) -> {
            LocalDateTime startOfDay = date.atStartOfDay();
            LocalDateTime startOfNextDay = date.plusDays(1).atStartOfDay();

            return cb.and(
                    cb.greaterThanOrEqualTo(
                            root.get("scheduledStartTime"),
                            startOfDay
                    ),
                    cb.lessThan(
                            root.get("scheduledStartTime"),
                            startOfNextDay
                    )
            );
        };
    }

    public static Specification<Trip> hasDateTimeRange(
            LocalDate today,
            LocalTime startTime,
            LocalTime endTime) {

        return (root, query, cb) -> {
            LocalDateTime rangeStart = today.atTime(startTime);
            LocalDateTime rangeEnd = today.atTime(endTime);

            return cb.and(
                    cb.lessThan(
                            root.<LocalDateTime>get("scheduledStartTime"),
                            rangeEnd
                    ),
                    cb.greaterThan(
                            root.<LocalDateTime>get("scheduledEndTime"),
                            rangeStart
                    )
            );
        };
    }

    public static Specification<Trip> hasBusId(Long busId) {
        return (root, query, cb) ->cb.equal(root.get("bus").get("id"), busId);
    }


    @Override
    public @Nullable Predicate toPredicate(Root<Trip> root, CriteriaQuery<?> query, CriteriaBuilder criteriaBuilder) {
        return null;
    }
}
