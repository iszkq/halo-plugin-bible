package run.halo.bible.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 书卷+章节+约名，用于前端按旧约/新约→卷名→章数展示。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BookChapterItem {

    private String covenantName;  // 约名：旧约 / 新约
    private String bookName;       // 卷名
    private int chapterNumber;     // 章数
}
