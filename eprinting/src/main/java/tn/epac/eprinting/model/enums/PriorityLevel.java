package tn.epac.eprinting.model.enums;

public enum PriorityLevel {


NORMAL,
HIGH1,
HIGH2,
HIGH3;

public static PriorityLevel fromValue(String value) {
    if (value == null) return NORMAL;

    switch (value.toUpperCase()) {
        case "NORMAL": return NORMAL;
        case "HIGH1": return HIGH1;
        case "HIGH2": return HIGH2;
        case "HIGH3": return HIGH3;
        default: return NORMAL;
    }
}}