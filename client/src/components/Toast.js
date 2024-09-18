export default function Toast({ data, timed=true, classes="" }) {
    const classesArray = [
        "toast",
        "border_shadowed",
        timed ? "toast_timed" : "",
        classes
    ].join(" ");
    return (
        <div className={classesArray}>
            <div className="inner">
                <h3 className="border_shadowed">{data.title}</h3>
                {data.msg === undefined ? null :
                    <p>{data?.msg}</p>
                }
            </div>

            {
                timed ?
                <div className="toast_time_bar" style={{ "animationDuration": "6s" }}/>
                : null
            }
        </div>
    )
}