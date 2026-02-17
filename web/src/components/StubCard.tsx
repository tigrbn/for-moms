import stubImg from "../assets/img/заглушка.png";

type StubCardProps = {
  title: string;
  desc: string;
  children?: React.ReactNode;
};

export function StubCard(props: StubCardProps) {
  return (
    <div className="card feed-empty">
      <div className="feed-empty-banner feed-empty-banner--stub">
        <img src={stubImg} alt="" />
        <div className="feed-empty-text-overlay">
          <div className="feed-empty-title">{props.title}</div>
          <div className="feed-empty-desc">{props.desc}</div>
          {props.children != null && <div className="feed-empty-actions">{props.children}</div>}
        </div>
      </div>
    </div>
  );
}
