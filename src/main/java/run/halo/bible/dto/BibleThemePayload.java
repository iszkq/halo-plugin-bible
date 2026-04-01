package run.halo.bible.dto;

import lombok.Data;

@Data
public class BibleThemePayload {

    private BibleSetting settings = new BibleSetting();
    private BibleEditsDto edits = new BibleEditsDto();
    private String builtinCsvPath = "/plugins/bible/assets/bible.csv";
    private String defaultIconUrl = "/plugins/bible/assets/login.png";
}
