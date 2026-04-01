package run.halo.bible.dto;

import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class BibleDiagnosticsDto {

    private String sourceMode = "builtin";
    private String sourceDetail = "";
    private int verseCount;
    private int chapterCount;
    private int deletedCount;
    private int updatedCount;
    private int createdCount;
    private String editsPath = "";
    private String configPath = "";
    private String lastReloadAt = "";
    private String lastError = "";
    private boolean floatEnabled;
    private String floatPosition = "right-bottom";
    private List<String> visiblePages = new ArrayList<>();
}
