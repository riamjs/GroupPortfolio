package com.aet.portfolio.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("site.classroom")
public record SiteProperties(List<String> whiteboardLines, List<String> tvSlides, List<String> teacherLines) {}
