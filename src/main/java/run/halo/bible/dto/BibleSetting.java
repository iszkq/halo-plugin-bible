package run.halo.bible.dto;

import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class BibleSetting {

    private String csvUrl = "";
    private String csvText = "";
    private boolean floatEnabled = true;
    private String floatPosition = "right-bottom";
    private List<String> visiblePages = new ArrayList<>(List.of("home", "post"));
    private String floatIconUrl = "";
    private String includePaths = "";
    private String excludePaths = "";
}
