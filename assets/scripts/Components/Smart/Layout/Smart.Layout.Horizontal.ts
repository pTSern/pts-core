import { _decorator, Enum } from 'cc';
import { Smart_Layout_Base, HorizontalAlign, VerticalAlign } from './Smart.Layout.Base';

export { HorizontalAlign, VerticalAlign };

const { ccclass, property } = _decorator;

@ccclass('Smart_Layout_Horizontal')
export class Smart_Layout_Horizontal extends Smart_Layout_Base {
    @property({ type: Enum(HorizontalAlign), tooltip: 'Horizontal alignment of children', visible() { return !this.autoSpacing; } })
    protected _horizontalAlign: HorizontalAlign = HorizontalAlign.LEFT;
    @property({ type: Enum(HorizontalAlign), tooltip: 'Horizontal alignment of children', visible() { return !this.autoSpacing; } })
    get horizontalAlign(): HorizontalAlign { return this._horizontalAlign; }
    set horizontalAlign(val: HorizontalAlign) {
        if (this._horizontalAlign !== val) {
            this._horizontalAlign = val;
            this._actDirtyLayout();
        }
    }

    @property({ type: Enum(VerticalAlign), tooltip: 'Vertical alignment of children within container' })
    protected _verticalAlign: VerticalAlign = VerticalAlign.CENTER;
    @property({ type: Enum(VerticalAlign), tooltip: 'Vertical alignment of children within container' })
    get verticalAlign(): VerticalAlign { return this._verticalAlign; }
    set verticalAlign(val: VerticalAlign) {
        if (this._verticalAlign !== val) {
            this._verticalAlign = val;
            this._actDirtyLayout();
        }
    }

    protected _update() {
        if (!this.node || !this.node.isValid) {
            return;
        }

        if (!this._init || this._isChildrenDirty) {
            this._getLayouts();
            this._init = true;
            this._isChildrenDirty = false;
        }

        const count = this._layouts.length;
        if (count === 0) {
            return;
        }

        const container = this.transform;
        if (!container || !container.isValid) {
            return;
        }

        const width = container.width;
        const height = container.height;
        const anchorX = container.anchorX;
        const anchorY = container.anchorY;

        const leftEdge = -width * anchorX;
        const usableStartX = leftEdge + this._paddingLeft;
        const usableWidth = width - this._paddingLeft - this._paddingRight;
        const usableEndX = leftEdge + width - this._paddingRight;

        const bottomEdge = -height * anchorY;
        const usableBottomY = bottomEdge + this._paddingBottom;
        const usableTopY = bottomEdge + height - this._paddingTop;
        const targetCenterY = (usableBottomY + usableTopY) * 0.5;

        // Calculate total children width (taking scaleX into account)
        let totalChildrenWidth = 0;
        for (let i = 0; i < count; ++i) {
            const childTrans = this._layouts[i];
            const scaleX = childTrans.node.scale.x;
            totalChildrenWidth += childTrans.width * Math.abs(scaleX);
        }

        let spacing = this._spacing;
        let currentLeft = usableStartX;

        if (this._autoSpacing) {
            if (count > 1) {
                const totalGap = usableWidth - totalChildrenWidth;
                spacing = totalGap / (count - 1);
                currentLeft = usableStartX;
            } else {
                // Single child: align according to horizontalAlign
                const childWidth = totalChildrenWidth;
                switch (this._horizontalAlign) {
                    case HorizontalAlign.CENTER:
                        currentLeft = usableStartX + (usableWidth - childWidth) * 0.5;
                        break;
                    case HorizontalAlign.RIGHT:
                        currentLeft = usableEndX - childWidth;
                        break;
                    case HorizontalAlign.LEFT:
                    default:
                        currentLeft = usableStartX;
                        break;
                }
            }
        } else {
            const totalLayoutWidth = totalChildrenWidth + spacing * (count - 1);
            switch (this._horizontalAlign) {
                case HorizontalAlign.CENTER:
                    currentLeft = usableStartX + (usableWidth - totalLayoutWidth) * 0.5;
                    break;
                case HorizontalAlign.RIGHT:
                    currentLeft = usableEndX - totalLayoutWidth;
                    break;
                case HorizontalAlign.LEFT:
                default:
                    currentLeft = usableStartX;
                    break;
            }
        }

        for (let i = 0; i < count; ++i) {
            const childTrans = this._layouts[i];
            if (!childTrans || !childTrans.isValid) continue;

            const childNode = childTrans.node;
            if (!childNode || !childNode.isValid) continue;

            const scaleX = childNode.scale.x;
            const absScaleX = Math.abs(scaleX);
            const childWidth = childTrans.width * absScaleX;

            const anchorOffsetX = scaleX >= 0
                ? childTrans.anchorX * childWidth
                : (1 - childTrans.anchorX) * childWidth;

            const posX = currentLeft + anchorOffsetX;

            // Calculate Y position
            let posY = childNode.position.y;
            if (this._verticalAlign !== VerticalAlign.NONE) {
                const scaleY = childNode.scale.y;
                const absScaleY = Math.abs(scaleY);
                const childHeight = childTrans.height * absScaleY;
                const anchorOffsetY = scaleY >= 0
                    ? childTrans.anchorY * childHeight
                    : (1 - childTrans.anchorY) * childHeight;

                switch (this._verticalAlign) {
                    case VerticalAlign.TOP:
                        posY = usableTopY - (childHeight - anchorOffsetY);
                        break;
                    case VerticalAlign.BOTTOM:
                        posY = usableBottomY + anchorOffsetY;
                        break;
                    case VerticalAlign.CENTER:
                        posY = targetCenterY + anchorOffsetY - childHeight * 0.5;
                        break;
                }
            }

            const curPos = childNode.position;
            if (Math.abs(curPos.x - posX) > 1e-3 || Math.abs(curPos.y - posY) > 1e-3) {
                childNode.setPosition(posX, posY, curPos.z);
            }

            currentLeft += childWidth + spacing;
        }
    }
}
