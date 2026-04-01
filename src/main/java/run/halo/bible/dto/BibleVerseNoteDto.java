package run.halo.bible.dto;

import lombok.Data;

@Data
public class BibleVerseNoteDto {

    private String key;
    private String covenantName;
    private String bookName;
    private int chapterNumber;
    private int verseNumber;
    private String html;
    private String updatedAt;
}
