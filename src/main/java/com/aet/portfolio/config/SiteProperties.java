package com.aet.portfolio.config;

import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.DecimalMax;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties("site")
public record SiteProperties(@Valid Classroom classroom, @Valid @DefaultValue Theme theme,
                             @Valid @DefaultValue Audio audio, @Valid @DefaultValue Intro intro,
                             List<@Valid Student> students) {
    public record Look(String skin, String hairStyle, String hairColor, String outfitColor, String accessory) {}
    public record Student(@NotBlank String id, @NotBlank String name, String line,
                          @Min(1) @Max(4) int row, @Min(1) @Max(4) int col,
                          boolean dance, @Valid Look look) {}

    @AssertTrue(message = "Student seats must be unique and cannot use viewer seat (4,2)")
    public boolean isStudentSeatingValid() {
        if (students == null) return true;
        var seats = new java.util.HashSet<Integer>();
        for (var student : students) {
            if ((student.row() == 4 && student.col() == 2) ||
                !seats.add(student.row() * 4 + student.col())) return false;
        }
        return true;
    }
    @Validated
    public record Intro(@DefaultValue("true") boolean enabled,
                        @DefaultValue("What if Sir Sean was a highschool teacher?") @NotBlank String title,
                        @DefaultValue("A Group 1 production") String subtitle,
                        @DefaultValue("true") boolean soundEnabled) {}
    public record Audio(@DefaultValue("/assets/audio/notebook-theme.mp3") String notebookTheme) {}
    public record Classroom(List<String> whiteboardLines, List<String> tvSlides, List<String> teacherLines,
                            Board board, Placard mission, Placard vision) {}
    public record Theme(@DefaultValue("0.8") @DecimalMin("0.0") @DecimalMax("1.0") double goldenIntensity,
                        @DefaultValue("true") boolean skyDrift) {}
    public record Board(String title, String subtitle, List<String> names) {}
    public record Placard(String title, String text) {}
}
