import stubImg from "../assets/img/заглушка.svg";

type StubCardProps = {
  title: string;
  desc: string;
  /** Своя картинка вместо дефолтной заглушки */
  image?: string;
  children?: React.ReactNode;
};

export function StubCard(props: StubCardProps) {
  const imgSrc = props.image ?? stubImg;
  return (
    <div className="card feed-empty">
      <div className="feed-empty-banner feed-empty-banner--stub">
        <img src={imgSrc} alt="" />
        <div className="feed-empty-text-overlay">
          <div className="feed-empty-title">{props.title}</div>
          <div className="feed-empty-desc">{props.desc}</div>
          {props.children != null && <div className="feed-empty-actions">{props.children}</div>}
        </div>
      </div>
    </div>
  );
}
