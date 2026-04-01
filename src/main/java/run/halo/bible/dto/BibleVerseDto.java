package run.halo.bible.dto;

import lombok.Data;

@Data
public class BibleVerseDto {

    private String id;
    private String covenantName;  // 约名
    private String category;      // 大类
    private String bookName;      // 卷名
    private int bookNumber;       // #卷数
    private int chapterNumber;    // #章数
    private int verseNumber;      // #节数
    private String content;       // 内容

    @Data
    public static class BookChapter {
        private final String bookName;
        private final int chapterNumber;
    }
}
