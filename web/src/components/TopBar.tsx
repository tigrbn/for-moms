type TopBarProps = {
  title?: string;
  sub?: React.ReactNode;
  right?: React.ReactNode;
  logo?: string;
  rightNode?: React.ReactNode;
};

export function TopBar(props: TopBarProps) {
  if (props.logo) {
    return (
      <div className="topbar topbar--logo">
        <div className="topbar-logo-wrap">
          <img src={props.logo} alt="Для мам" className="topbar-logo" />
        </div>
        {props.rightNode != null && <div className="topbar-right">{props.rightNode}</div>}
      </div>
    );
  }
  return (
    <div className="card topbar">
      <div className="row">
        <div>
          {props.title && <div className="h1">{props.title}</div>}
          {props.sub && <div className="muted" style={{ marginTop: 4 }}>{props.sub}</div>}
        </div>
        <div className="spacer" />
        {props.right}
      </div>
    </div>
  );
}
